(function () {
  const DANYBOT_INTERSTITIAL_TEST_AD_ID =
    "ca-app-pub-3940256099942544/1033173712";

  let admobInitialized = false;
  let interstitialReady = false;
  let interstitialPreparing = false;


  function getDanyBotAdMobPlugin() {
    if (!window.Capacitor || !window.Capacitor.Plugins) {
      return null;
    }

    return window.Capacitor.Plugins.AdMob || null;
  }


  function isDanyBotAdMobNativeApp() {
    return (
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform()
    );
  }


  async function prepareDanyBotInterstitial() {
    if (!isDanyBotAdMobNativeApp()) {
      return false;
    }

    if (interstitialReady) {
      return true;
    }

    if (interstitialPreparing) {
      return false;
    }

    const AdMob = getDanyBotAdMobPlugin();

    if (!AdMob) {
      console.warn("Plugin AdMob no disponible.");
      return false;
    }

    interstitialPreparing = true;

    try {
      await AdMob.prepareInterstitial({
        adId: DANYBOT_INTERSTITIAL_TEST_AD_ID,
        isTesting: true
      });

      interstitialReady = true;

      console.log(
        "Interstitial AdMob de prueba preparado."
      );

      return true;
    } catch (error) {
      interstitialReady = false;

      console.error(
        "Error al preparar interstitial AdMob:",
        error
      );

      return false;
    } finally {
      interstitialPreparing = false;
    }
  }


  async function initializeDanyBotAdMob() {
    if (!isDanyBotAdMobNativeApp()) {
      return false;
    }

    const AdMob = getDanyBotAdMobPlugin();

    if (!AdMob) {
      console.warn("Plugin AdMob no disponible.");
      return false;
    }

    try {
      if (!admobInitialized) {
        await AdMob.initialize({
          initializeForTesting: true
        });

        admobInitialized = true;

        console.log(
          "AdMob inicializado en modo de prueba."
        );
      }

      await prepareDanyBotInterstitial();

      return true;
    } catch (error) {
      console.error(
        "Error al inicializar AdMob:",
        error
      );

      return false;
    }
  }


  async function showDanyBotInterstitial() {
    if (!isDanyBotAdMobNativeApp()) {
      return false;
    }

    const AdMob = getDanyBotAdMobPlugin();

    if (!AdMob) {
      return false;
    }

    if (!admobInitialized) {
      const initialized =
        await initializeDanyBotAdMob();

      if (!initialized) {
        return false;
      }
    }

    if (!interstitialReady) {
      const prepared =
        await prepareDanyBotInterstitial();

      if (!prepared) {
        return false;
      }
    }

    try {
      await AdMob.showInterstitial();

      interstitialReady = false;

      console.log(
        "Interstitial AdMob de prueba mostrado."
      );

      return true;
    } catch (error) {
      interstitialReady = false;

      console.error(
        "Error al mostrar interstitial AdMob:",
        error
      );

      return false;
    }
  }


  window.DANYBOT_ADS = {
    initialize: initializeDanyBotAdMob,
    prepareInterstitial:
      prepareDanyBotInterstitial,
    showInterstitial:
      showDanyBotInterstitial,
    isInterstitialReady: function () {
      return interstitialReady;
    }
  };


  document.addEventListener(
    "DOMContentLoaded",
    async function () {
      await initializeDanyBotAdMob();

      if (
        window.DANYBOT_ADS &&
        typeof window.DANYBOT_ADS.showPendingIfEligible === "function"
      ) {
        await window.DANYBOT_ADS.showPendingIfEligible();
      }
    }
  );
})();

(function () {
  const ACTION_COUNT_KEY =
    "danybot_ad_action_count";

  const PENDING_AD_KEY =
    "danybot_ad_pending";

  const LAST_AD_SHOWN_KEY =
    "danybot_ad_last_shown";

  const ACTIONS_REQUIRED = 5;

  const AD_COOLDOWN_MS =
    5 * 60 * 1000;


  function isNativeDanyBotApp() {
    return (
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform()
    );
  }


  function registerDanyBotCreation() {
    if (!isNativeDanyBotApp()) {
      return false;
    }

    if (
      localStorage.getItem(PENDING_AD_KEY) === "1"
    ) {
      return true;
    }

    const currentValue =
      Number(
        localStorage.getItem(ACTION_COUNT_KEY) ||
        "0"
      ) || 0;

    const nextValue =
      Math.max(0, currentValue) + 1;

    if (nextValue >= ACTIONS_REQUIRED) {
      localStorage.setItem(
        ACTION_COUNT_KEY,
        "0"
      );

      localStorage.setItem(
        PENDING_AD_KEY,
        "1"
      );

      console.log(
        "AdMob: interstitial pendiente."
      );

      return true;
    }

    localStorage.setItem(
      ACTION_COUNT_KEY,
      String(nextValue)
    );

    console.log(
      `AdMob: acción ${nextValue}/${ACTIONS_REQUIRED}.`
    );

    return false;
  }


  async function showPendingDanyBotAd() {
    if (!isNativeDanyBotApp()) {
      return false;
    }

    if (
      localStorage.getItem(PENDING_AD_KEY) !== "1"
    ) {
      return false;
    }

    const pathname =
      window.location.pathname.toLowerCase();

    if (!pathname.endsWith("dashboard.html")) {
      return false;
    }

    const lastShown =
      Number(
        localStorage.getItem(
          LAST_AD_SHOWN_KEY
        ) || "0"
      ) || 0;

    if (
      lastShown > 0 &&
      Date.now() - lastShown < AD_COOLDOWN_MS
    ) {
      return false;
    }

    if (
      !window.DANYBOT_ADS ||
      typeof window.DANYBOT_ADS.showInterstitial !==
        "function"
    ) {
      return false;
    }

    const shown =
      await window.DANYBOT_ADS.showInterstitial();

    if (!shown) {
      return false;
    }

    localStorage.removeItem(
      PENDING_AD_KEY
    );

    localStorage.setItem(
      LAST_AD_SHOWN_KEY,
      String(Date.now())
    );

    console.log(
      "AdMob: interstitial pendiente mostrado."
    );

    return true;
  }


  window.DANYBOT_ADS.registerCreation =
    registerDanyBotCreation;

  window.DANYBOT_ADS.showPendingIfEligible =
    showPendingDanyBotAd;

  window.DANYBOT_ADS.showReportInterstitial =
    async function () {
      try {
        if (
          !window.DANYBOT_ADS ||
          typeof window.DANYBOT_ADS.showInterstitial !== "function"
        ) {
          return false;
        }

        if (
          typeof window.DANYBOT_ADS.isInterstitialReady === "function" &&
          !window.DANYBOT_ADS.isInterstitialReady() &&
          typeof window.DANYBOT_ADS.prepareInterstitial === "function"
        ) {
          await window.DANYBOT_ADS.prepareInterstitial();
        }

        const shown =
          await window.DANYBOT_ADS.showInterstitial();

        if (shown) {
          localStorage.setItem(
            LAST_AD_SHOWN_KEY,
            String(Date.now())
          );

          localStorage.setItem(
            PENDING_AD_KEY,
            "0"
          );
        }

        return shown;
      } catch (error) {
        console.warn(
          "AdMob: anuncio de reporte no disponible:",
          error
        );

        return false;
      }
    };

  window.DANYBOT_ADS.getPolicyState =
    function () {
      return {
        actions:
          Number(
            localStorage.getItem(
              ACTION_COUNT_KEY
            ) || "0"
          ) || 0,

        pending:
          localStorage.getItem(
            PENDING_AD_KEY
          ) === "1",

        lastShown:
          Number(
            localStorage.getItem(
              LAST_AD_SHOWN_KEY
            ) || "0"
          ) || 0
      };
    };

  async function handleDanyBotAdMobHashChange() {
    if (!window.location.hash) {
      await showPendingDanyBotAd();
    }
  }

  window.addEventListener(
    "hashchange",
    handleDanyBotAdMobHashChange
  );
})();