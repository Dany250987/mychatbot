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


async function initializeDanyBotAdMob() {
  if (!isDanyBotAdMobNativeApp()) {
    return;
  }

  const AdMob = getDanyBotAdMobPlugin();

  if (!AdMob) {
    console.warn("Plugin AdMob no disponible.");
    return;
  }

  try {
    await AdMob.initialize({
      initializeForTesting: true
    });

    await AdMob.showBanner({
      adId: "ca-app-pub-8021034465222600/8361355640",
      adSize: "ADAPTIVE_BANNER",
      position: "BOTTOM_CENTER",
      margin: 0,
      isTesting: true
    });

    console.log("Banner AdMob de prueba cargado.");
  } catch (error) {
    console.error("Error al inicializar AdMob:", error);
  }
}


document.addEventListener("DOMContentLoaded", () => {
  initializeDanyBotAdMob();
});