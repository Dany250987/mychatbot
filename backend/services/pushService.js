const crypto = require("crypto");
const connection = require("../db/connection");

const {
  initializeApp,
  applicationDefault,
  cert,
  getApps
} = require("firebase-admin/app");

const {
  getMessaging
} = require("firebase-admin/messaging");

let firebaseApp = null;
let schedulerStarted = false;
let schedulerRunning = false;
let tablesReadyPromise = null;
let missingCredentialsLogged = false;


function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (error, results) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(results);
    });
  });
}


function hashPushToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
}


function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const existingApps = getApps();

  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  try {
    /*
     * Producción / Railway:
     * permite guardar el JSON completo del service account
     * como Base64 en una variable privada.
     */
    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
      const rawJson = Buffer
        .from(
          process.env.FIREBASE_SERVICE_ACCOUNT_B64,
          "base64"
        )
        .toString("utf8");

      const serviceAccount = JSON.parse(rawJson);

      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });

      return firebaseApp;
    }

    /*
     * Desarrollo local:
     * GOOGLE_APPLICATION_CREDENTIALS puede apuntar
     * al JSON privado sin copiarlo al proyecto.
     */
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseApp = initializeApp({
        credential: applicationDefault(),
        ...(process.env.FIREBASE_PROJECT_ID
          ? {
              projectId:
                process.env.FIREBASE_PROJECT_ID
            }
          : {})
      });

      return firebaseApp;
    }

    /*
     * Alternativa por variables individuales.
     */
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      firebaseApp = initializeApp({
        credential: cert({
          projectId:
            process.env.FIREBASE_PROJECT_ID,

          clientEmail:
            process.env.FIREBASE_CLIENT_EMAIL,

          privateKey:
            process.env.FIREBASE_PRIVATE_KEY
              .replace(/\\n/g, "\n")
        }),

        projectId:
          process.env.FIREBASE_PROJECT_ID
      });

      return firebaseApp;
    }

    if (!missingCredentialsLogged) {
      missingCredentialsLogged = true;

      console.warn(
        "FCM: faltan credenciales Firebase Admin. " +
        "El registro de dispositivos funcionará, " +
        "pero el servidor todavía no podrá enviar push."
      );
    }

    return null;
  } catch (error) {
    console.error(
      "FCM: error inicializando Firebase Admin:",
      error
    );

    return null;
  }
}


function ensurePushTables() {
  if (tablesReadyPromise) {
    return tablesReadyPromise;
  }

  tablesReadyPromise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id BIGINT NOT NULL AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        token TEXT NOT NULL,
        token_hash CHAR(64) NOT NULL,
        platform VARCHAR(20) NOT NULL DEFAULT 'android',
        timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL
          DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,

        PRIMARY KEY (id),
        UNIQUE KEY uq_push_token_hash (token_hash),
        KEY idx_push_user_active (user_id, active)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS reminder_push_log (
        id BIGINT NOT NULL AUTO_INCREMENT,
        reminder_id BIGINT NOT NULL,
        token_hash CHAR(64) NOT NULL,
        scheduled_key VARCHAR(32) NOT NULL,
        sent_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id),

        UNIQUE KEY uq_reminder_push (
          reminder_id,
          token_hash,
          scheduled_key
        )
      )
    `);

    console.log("FCM: tablas push verificadas.");
  })().catch((error) => {
    tablesReadyPromise = null;
    throw error;
  });

  return tablesReadyPromise;
}


async function registerPushToken({
  userId,
  token,
  platform = "android",
  timezone = "UTC"
}) {
  await ensurePushTables();

  const tokenHash = hashPushToken(token);

  await query(
    `
      INSERT INTO push_tokens (
        user_id,
        token,
        token_hash,
        platform,
        timezone,
        active
      )
      VALUES (?, ?, ?, ?, ?, 1)

      ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id),
        token = VALUES(token),
        platform = VALUES(platform),
        timezone = VALUES(timezone),
        active = 1
    `,
    [
      userId,
      token,
      tokenHash,
      platform,
      timezone
    ]
  );

  return tokenHash;
}


async function deactivatePushToken(token) {
  await ensurePushTables();

  const tokenHash = hashPushToken(token);

  await query(
    `
      UPDATE push_tokens
      SET active = 0
      WHERE token_hash = ?
    `,
    [tokenHash]
  );
}


async function deactivatePushTokenByHash(tokenHash) {
  await query(
    `
      UPDATE push_tokens
      SET active = 0
      WHERE token_hash = ?
    `,
    [tokenHash]
  );
}


function isInvalidTokenError(error) {
  const code = String(error?.code || "");

  return (
    code ===
      "messaging/registration-token-not-registered" ||
    code ===
      "messaging/invalid-registration-token"
  );
}


async function sendPushMessage(
  token,
  reminder,
  scheduledKey
) {
  const app = getFirebaseApp();

  if (!app) {
    throw new Error(
      "Firebase Admin no está configurado."
    );
  }

  const title =
    reminder.title || "Día en Orden";

  const body =
    reminder.description ||
    reminder.original_text ||
    "Tienes una actividad programada.";

  const message = {
    token,

    notification: {
      title: String(title).substring(0, 120),
      body: String(body).substring(0, 240)
    },

    android: {
      /*
       * HIGH permite a FCM intentar despertar
       * el dispositivo cuando está en Doze.
       */
      priority: "high",

      notification: {
        channelId: "danybot_reminders_v2",
        icon: "ic_stat_dia_en_orden",
        color: "#960018",
        sound: "danybot_reminder",
        priority: "high",
        visibility: "public",
        defaultVibrateTimings: true,

        tag:
          "danybot-reminder-" +
          String(reminder.id) +
          "-" +
          String(scheduledKey)
      }
    },

    data: {
      type: "reminder",
      reminderId: String(reminder.id)
    }
  };

  return getMessaging(app).send(message);
}


function getZonedDateParts(date, timezone) {
  const formatter =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });

  const parts =
    formatter.formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}


function isReminderDueNow(row) {
  let nowParts;

  try {
    nowParts = getZonedDateParts(
      new Date(),
      row.timezone || "UTC"
    );
  } catch (error) {
    console.warn(
      "FCM: zona horaria inválida:",
      row.timezone
    );

    return false;
  }

  const dateParts =
    String(row.reminder_date)
      .split("-")
      .map(Number);

  const timeParts =
    String(row.reminder_time)
      .split(":")
      .map(Number);

  if (
    dateParts.length !== 3 ||
    timeParts.length < 2
  ) {
    return false;
  }

  const scheduledPseudoUtc = Date.UTC(
    dateParts[0],
    dateParts[1] - 1,
    dateParts[2],
    timeParts[0],
    timeParts[1],
    timeParts[2] || 0
  );

  const nowPseudoUtc = Date.UTC(
    nowParts.year,
    nowParts.month - 1,
    nowParts.day,
    nowParts.hour,
    nowParts.minute,
    nowParts.second
  );

  const delay =
    nowPseudoUtc - scheduledPseudoUtc;

  /*
   * Se acepta hasta 5 minutos de recuperación
   * si Railway reinicia justo en la hora del aviso.
   */
  return delay >= 0 && delay < 5 * 60 * 1000;
}


async function claimReminderDelivery(row) {
  const scheduledKey =
    String(row.reminder_date) +
    "T" +
    String(row.reminder_time);

  const result = await query(
    `
      INSERT IGNORE INTO reminder_push_log (
        reminder_id,
        token_hash,
        scheduled_key,
        sent_at
      )
      VALUES (?, ?, ?, NULL)
    `,
    [
      row.id,
      row.token_hash,
      scheduledKey
    ]
  );

  return {
    claimed: result.affectedRows === 1,
    scheduledKey
  };
}


async function deliverReminder(row) {
  const claim =
    await claimReminderDelivery(row);

  if (!claim.claimed) {
    return;
  }

  try {
    await sendPushMessage(
      row.token,
      row,
      claim.scheduledKey
    );

    await query(
      `
        UPDATE reminder_push_log
        SET sent_at = NOW()
        WHERE reminder_id = ?
          AND token_hash = ?
          AND scheduled_key = ?
      `,
      [
        row.id,
        row.token_hash,
        claim.scheduledKey
      ]
    );

    console.log(
      `FCM: recordatorio ${row.id} enviado.`
    );
  } catch (error) {
    console.error(
      `FCM: fallo enviando recordatorio ${row.id}:`,
      error?.code || error?.message || error
    );

    if (isInvalidTokenError(error)) {
      await deactivatePushTokenByHash(
        row.token_hash
      );
    }

    /*
     * Si el envío falló, liberamos el registro
     * para permitir un reintento en el siguiente ciclo.
     */
    await query(
      `
        DELETE FROM reminder_push_log
        WHERE reminder_id = ?
          AND token_hash = ?
          AND scheduled_key = ?
          AND sent_at IS NULL
      `,
      [
        row.id,
        row.token_hash,
        claim.scheduledKey
      ]
    );
  }
}


async function runReminderPushCycle() {
  if (schedulerRunning) {
    return;
  }

  schedulerRunning = true;

  try {
    await ensurePushTables();

    /*
     * Si todavía faltan las credenciales,
     * no se marca ningún recordatorio como enviado.
     */
    if (!getFirebaseApp()) {
      return;
    }

    const rows = await query(`
      SELECT
        r.id,
        r.user_id,
        r.title,
        r.original_text,
        r.description,

        DATE_FORMAT(
          r.reminder_date,
          '%Y-%m-%d'
        ) AS reminder_date,

        TIME_FORMAT(
          r.reminder_time,
          '%H:%i:%s'
        ) AS reminder_time,

        pt.token,
        pt.token_hash,
        pt.timezone

      FROM reminders r

      INNER JOIN push_tokens pt
        ON pt.user_id = r.user_id
        AND pt.active = 1

      WHERE r.reminder_time IS NOT NULL

        AND COALESCE(
          r.status,
          'activo'
        ) NOT IN (
          'papelera',
          'completado'
        )

        /*
         * Ventana amplia para cubrir zonas horarias.
         */
        AND r.reminder_date BETWEEN
          DATE_SUB(
            UTC_DATE(),
            INTERVAL 1 DAY
          )
          AND
          DATE_ADD(
            UTC_DATE(),
            INTERVAL 1 DAY
          )

      LIMIT 1000
    `);

    for (const row of rows) {
      if (!isReminderDueNow(row)) {
        continue;
      }

      await deliverReminder(row);
    }
  } catch (error) {
    console.error(
      "FCM: error ejecutando ciclo de recordatorios:",
      error
    );
  } finally {
    schedulerRunning = false;
  }
}


function startReminderPushScheduler() {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  ensurePushTables()
    .then(() => {
      console.log(
        "FCM: programador de recordatorios iniciado."
      );

      runReminderPushCycle();

      setInterval(
        runReminderPushCycle,
        15000
      );
    })
    .catch((error) => {
      console.error(
        "FCM: no fue posible iniciar programador:",
        error
      );

      schedulerStarted = false;
    });
}


async function sendPushToUser(
  userId,
  notification
) {
  await ensurePushTables();

  const devices = await query(
    `
      SELECT
        token,
        token_hash
      FROM push_tokens
      WHERE user_id = ?
        AND active = 1
    `,
    [userId]
  );

  const results = [];

  for (const device of devices) {
    try {
      const messageId =
        await sendPushMessage(
          device.token,
          notification,
          "manual-" + Date.now()
        );

      results.push({
        ok: true,
        messageId
      });
    } catch (error) {
      if (isInvalidTokenError(error)) {
        await deactivatePushTokenByHash(
          device.token_hash
        );
      }

      results.push({
        ok: false,
        error:
          error?.code ||
          error?.message ||
          String(error)
      });
    }
  }

  return results;
}


module.exports = {
  ensurePushTables,
  registerPushToken,
  deactivatePushToken,
  sendPushToUser,
  startReminderPushScheduler
};
