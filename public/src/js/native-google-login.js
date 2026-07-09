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
      <span class="native-google-icon">G</span>
      Continuar con Google
    </button>
  `;

  const nativeGoogleButton = document.getElementById("nativeGoogleLoginButton");

  if (nativeGoogleButton) {
    nativeGoogleButton.addEventListener("click", loginWithDanyBotNativeGoogle);
  }
}

document.addEventListener("DOMContentLoaded", renderDanyBotNativeGoogleButton);
