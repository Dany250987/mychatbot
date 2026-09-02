(function () {
  "use strict";

  if (window.__danybotPushScriptLoaded) {
    return;
  }

  window.__danybotPushScriptLoaded = true;


  function isNativeAndroidApp() {
    return Boolean(
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform ===
        "function" &&
      window.Capacitor.isNativePlatform()
    );
  }


  function getDanyBotAuthToken() {
    try {
      if (
        typeof window.getReminderAuthToken ===
        "function"
      ) {
        return window.getReminderAuthToken();
      }

      if (
        typeof getReminderAuthToken ===
        "function"
      ) {
        return getReminderAuthToken();
      }
    } catch (error) {
      console.warn(
        "[DANYBOT-PUSH] No fue posible leer token de sesión."
      );
    }

    return null;
  }


  async function registerPushTokenInBackend(
    pushToken,
    attempt = 0
  ) {
    const authToken =
      getDanyBotAuthToken();

    if (!authToken) {
      if (attempt < 10) {
        window.setTimeout(
          () => {
            registerPushTokenInBackend(
              pushToken,
              attempt + 1
            );
          },
          1500
        );
      }

      return;
    }

    const timezone =
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone ||
      "UTC";

    try {
      const response = await fetch(
        "/api/push/register",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${authToken}`
          },

          body: JSON.stringify({
            token: pushToken,
            platform: "android",
            timezone
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          "HTTP " + response.status
        );
      }

      console.log(
        "[DANYBOT-PUSH] dispositivo registrado en backend."
      );
    } catch (error) {
      console.error(
        "[DANYBOT-PUSH] error registrando dispositivo:",
        error
      );
    }
  }


  async function initializeDanyBotPushNotifications() {
    if (
      window.__danybotPushInitialized
    ) {
      return;
    }

    if (!isNativeAndroidApp()) {
      return;
    }

    window.__danybotPushInitialized = true;

    const PushNotifications =
      window.Capacitor?.Plugins
        ?.PushNotifications;

    if (!PushNotifications) {
      console.error(
        "[DANYBOT-PUSH] Plugin PushNotifications no disponible."
      );

      return;
    }

    PushNotifications.addListener(
      "registration",
      (token) => {
        if (!token?.value) {
          return;
        }

        window.DANYBOT_FCM_TOKEN =
          token.value;

        console.log(
          "[DANYBOT-PUSH] token FCM recibido."
        );

        registerPushTokenInBackend(
          token.value
        );
      }
    );

    PushNotifications.addListener(
      "registrationError",
      (error) => {
        console.error(
          "[DANYBOT-PUSH] error de registro:",
          error
        );
      }
    );

    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log(
          "[DANYBOT-PUSH] push recibido en primer plano:",
          notification
        );
      }
    );

    try {
      let permission =
        await PushNotifications
          .checkPermissions();

      if (
        permission.receive !==
        "granted"
      ) {
        permission =
          await PushNotifications
            .requestPermissions();
      }

      if (
        permission.receive !==
        "granted"
      ) {
        console.warn(
          "[DANYBOT-PUSH] permiso no concedido."
        );

        return;
      }

      await PushNotifications.register();
    } catch (error) {
      console.error(
        "[DANYBOT-PUSH] error inicializando:",
        error
      );
    }
  }


  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeDanyBotPushNotifications,
      {
        once: true
      }
    );
  } else {
    initializeDanyBotPushNotifications();
  }
})();
