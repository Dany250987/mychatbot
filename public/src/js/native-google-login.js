const DANYBOT_GOOGLE_WEB_CLIENT_ID = "625571352027-jgsi8eovhcd2b4or9uohaog1f8663d8i.apps.googleusercontent.com";

let danyBotGoogleNativeInitialized = false;

function isDanyBotNativeAppLogin() {
  if (
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === "function"
  ) {
    return window.Capacitor.isNativePlatform();
  }

  return (
    window.location.origin === "http://localhost" ||
    window.location.origin === "https://localhost" ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "ionic:"
  );
}

function getDanyBotSocialLoginPlugin() {
  if (!window.Capacitor || !window.Capacitor.Plugins) {
    return null;
  }

  return window.Capacitor.Plugins.SocialLogin || null;
}

async function initializeDanyBotGoogleNativeLogin() {
  if (danyBotGoogleNativeInitialized) {
    return;
  }

  const SocialLogin = getDanyBotSocialLoginPlugin();

  if (!SocialLogin) {
    throw new Error("Plugin SocialLogin no disponible.");
  }

  await SocialLogin.initialize({
    google: {
      webClientId: DANYBOT_GOOGLE_WEB_CLIENT_ID
    }
  });

  danyBotGoogleNativeInitialized = true;
}

async function loginWithDanyBotNativeGoogle() {
  const nativeGoogleButton = document.getElementById("nativeGoogleLoginButton");

  try {
    const SocialLogin = getDanyBotSocialLoginPlugin();

    if (!SocialLogin) {
      await showAuthMessage({
        title: "Google no disponible",
        text: "El login nativo de Google no estÃ¡ disponible en este dispositivo.",
        icon: "warning"
      });
      return;
    }

    if (nativeGoogleButton) {
      nativeGoogleButton.disabled = true;
      nativeGoogleButton.textContent = "Conectando con Google...";
    }

    await initializeDanyBotGoogleNativeLogin();

    const login = await SocialLogin.login({
        provider: "google",
        options: {}
      });

    const credential = login && login.result ? login.result.idToken : null;

    if (!credential) {
      throw new Error("Google no devolviÃ³ un idToken vÃ¡lido.");
    }

    const apiResponse = await fetch("/api/auth/google-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        credential
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok || !data.user || !data.token) {
      await showAuthMessage({
        title: "No se pudo iniciar sesiÃ³n",
        text: data.message || data.error || "OcurriÃ³ un error al validar tu cuenta de Google.",
        icon: "error"
      });
      return;
    }

    saveUserSession(data.user, data.token);

    await showAuthMessage({
      title: "Bienvenida",
      text: data.message || `Hola ${data.user.name}, ingresaste correctamente.`,
      icon: "success"
    });

    redirectToDashboard();

  } catch (error) {
    console.error("Error en Google nativo:", error);

    await showAuthMessage({
      title: "Error con Google",
      text: error.message || "No fue posible iniciar sesiÃ³n con Google.",
      icon: "error"
    });

  } finally {
    if (nativeGoogleButton) {
      nativeGoogleButton.disabled = false;
      nativeGoogleButton.innerHTML = `
        <span class="native-google-icon">G</span>
        Continuar con Google
      `;
    }
  }
}

function renderDanyBotNativeGoogleButton() {
  if (!isDanyBotNativeAppLogin()) {
    return;
  }

  const googleContainer = document.querySelector(".g_id_signin");

  if (!googleContainer) {
    return;
  }

  googleContainer.innerHTML = `
  <button type="button" id="nativeGoogleLoginButton" class="native-google-login-button">
    <span class="native-google-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" class="native-google-svg">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"/>
      </svg>
    </span>
    <span>Continuar con Google</span>
  </button>
`;

  const nativeGoogleButton = document.getElementById("nativeGoogleLoginButton");

  if (nativeGoogleButton) {
    nativeGoogleButton.addEventListener("click", loginWithDanyBotNativeGoogle);
  }
}

document.addEventListener("DOMContentLoaded", renderDanyBotNativeGoogleButton);
