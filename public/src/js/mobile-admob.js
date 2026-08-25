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
    function () {
      initializeDanyBotAdMob();
    }
  );
})();