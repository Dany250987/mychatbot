const express = require("express");
const authMiddleware =
  require("../middlewares/authMiddleware");

const {
  ensurePushTables,
  registerPushToken,
  deactivatePushToken,
  sendPushToUser
} = require("../services/pushService");

const router = express.Router();

router.use(authMiddleware);


function normalizeTimezone(value) {
  const timezone =
    String(value || "UTC").trim();

  try {
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: timezone
      }
    ).format();

    return timezone;
  } catch (error) {
    return "UTC";
  }
}


router.post("/register", async (req, res) => {
  try {
    const userId = req.user.id;

    const token =
      String(req.body.token || "").trim();

    const platform =
      String(
        req.body.platform || "android"
      ).trim();

    const timezone =
      normalizeTimezone(
        req.body.timezone
      );

    if (token.length < 20) {
      return res.status(400).json({
        mensaje:
          "Token push inválido."
      });
    }

    await ensurePushTables();

    await registerPushToken({
      userId,
      token,
      platform,
      timezone
    });

    res.json({
      mensaje:
        "Dispositivo registrado para notificaciones push."
    });
  } catch (error) {
    console.error(
      "Error registrando token push:",
      error
    );

    res.status(500).json({
      mensaje:
        "No fue posible registrar el dispositivo."
    });
  }
});


router.post(
  "/unregister",
  async (req, res) => {
    try {
      const token =
        String(req.body.token || "").trim();

      if (!token) {
        return res.status(400).json({
          mensaje:
            "Token push obligatorio."
        });
      }

      await deactivatePushToken(token);

      res.json({
        mensaje:
          "Dispositivo desregistrado."
      });
    } catch (error) {
      console.error(
        "Error desregistrando token push:",
        error
      );

      res.status(500).json({
        mensaje:
          "No fue posible desregistrar el dispositivo."
      });
    }
  }
);


/*
 * Prueba real desde nuestro backend.
 * Después podremos retirar esta ruta.
 */
router.post("/test", async (req, res) => {
  try {
    const results =
      await sendPushToUser(
        req.user.id,
        {
          id:
            "test-" +
            Date.now(),

          title:
            "Prueba Día en Orden",

          description:
            "FCM desde el backend funciona correctamente."
        }
      );

    res.json({
      mensaje:
        "Prueba push procesada.",
      results
    });
  } catch (error) {
    console.error(
      "Error enviando push de prueba:",
      error
    );

    res.status(500).json({
      mensaje:
        "No fue posible enviar la prueba push."
    });
  }
});


module.exports = router;
