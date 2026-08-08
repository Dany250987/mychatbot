// ==============================================
// DANYBOT - DETECCIÓN DE SIGNUP NATIVO ANDROID
// ==============================================

function applyDanyBotNativeSignupClass() {
  const isNativeApp = Boolean(
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === "function" &&
    window.Capacitor.isNativePlatform()
  );

  document.documentElement.classList.toggle(
    "danybot-mobile-app",
    isNativeApp
  );
}

applyDanyBotNativeSignupClass();