function loginT(key, fallback) {
  if (
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.t === "function"
  ) {
    return window.DANYBOT_I18N.t(key) || fallback;
  }

  return fallback;
}

function getLoginLanguage() {
  if (
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.getLanguage === "function"
  ) {
    return window.DANYBOT_I18N.getLanguage();
  }

  return "es";
}

function getLoginResponseText(data, key, fallback) {
  if (getLoginLanguage() === "en") {
    return loginT(key, fallback);
  }

  return (
    data?.error ||
    data?.message ||
    data?.mensaje ||
    loginT(key, fallback)
  );
}

function setupLoginLanguageSelector() {
  const languageSelect =
    document.getElementById("loginLanguageSelect");

  if (!languageSelect) {
    return;
  }

  languageSelect.value =
    getLoginLanguage();

  languageSelect.addEventListener(
    "change",
    () => {
      const language = languageSelect.value;

      if (
        window.DANYBOT_I18N &&
        typeof window.DANYBOT_I18N.setLanguage === "function"
      ) {
        window.DANYBOT_I18N.setLanguage(language);
      }
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  setupLoginLanguageSelector
);
// ===============================
// Autenticación de usuarios
// Login con Google y login clásico
// ===============================

function showAuthMessage({ title, text, icon }) {
  if (typeof Swal !== "undefined") {
    const isWelcomeMessage =
      title === loginT(
        "login.welcomeTitle",
        "Bienvenida"
      );

    return Swal.fire({
      title,
      text,
      icon,
      confirmButtonColor: "#3c0000",

      customClass: isWelcomeMessage
        ? {
            popup:
              "danybot-biometric-popup",

            icon:
              "danybot-auth-welcome-icon",

            title:
              "danybot-biometric-title",

            htmlContainer:
              "danybot-biometric-text",

            actions:
              "danybot-biometric-actions",

            confirmButton:
              "danybot-biometric-confirm"
          }
        : {}
    });
  }

  alert(text || title);
  return Promise.resolve();
}

function saveUserSession(user, token) {
  localStorage.setItem("userData", JSON.stringify(user));
  localStorage.setItem("authToken", token);
}

function redirectToDashboard() {
  window.location.href = "dashboard.html";
}

async function requestPasswordResetCode(email) {
  const response = await fetch("/api/auth/request-password-reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.mensaje || "No se pudo enviar el código.");
  }

  return data;
}

async function resetPassword(email, code, newPassword) {
  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      code,
      new_password: newPassword
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(getLoginResponseText(data, "login.passwordResetFailed", "No se pudo cambiar la contraseña."));
  }

  return data;
}

async function startForgotPasswordFlow() {
  const emailResult = await Swal.fire({
    title: loginT("login.passwordResetTitle", "Recuperar contraseña"),
    text: loginT("login.passwordResetText", "Ingresa el correo registrado en tu cuenta."),
    input: "email",
    inputPlaceholder: "correo@ejemplo.com",

    showCancelButton: true,
    confirmButtonText: loginT("login.sendCode", "Enviar código"),
    cancelButtonText: loginT("login.cancel", "Cancelar"),

    confirmButtonColor: "#3c0000",
    cancelButtonColor: "#6b7280",

    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),

    customClass: {
      popup: "danybot-password-reset-popup",
      title: "danybot-password-reset-title",
      htmlContainer: "danybot-password-reset-text",
      input: "danybot-password-reset-input",
      actions: "danybot-password-reset-actions",
      confirmButton: "danybot-password-reset-confirm",
      cancelButton: "danybot-password-reset-cancel"
    },

    preConfirm: async (email) => {
      const cleanEmail = String(email || "").trim().toLowerCase();

      if (!cleanEmail) {
        Swal.showValidationMessage(loginT("login.enterEmail", "Ingresa tu correo."));
        return false;
      }

      try {
        await requestPasswordResetCode(cleanEmail);
        return cleanEmail;
      } catch (error) {
        Swal.showValidationMessage(error.message);
        return false;
      }
    }
  });

  if (!emailResult.isConfirmed) {
    return;
  }

  const email = emailResult.value;

  const resetResult = await Swal.fire({
    title: loginT("login.codeSentTitle", "Código enviado"),

    html: `
      <p>${loginT("login.codeSentText", "Enviamos un código de recuperación a:")}</p>
      <strong>${email}</strong>

      <input
        id="resetPasswordCode"
        class="swal2-input"
        placeholder="${loginT("login.verificationCode", "Código de verificación")}"
        maxlength="6"
      >

      <input
        id="resetNewPassword"
        type="password"
        class="swal2-input"
        placeholder="${loginT("login.newPassword", "Nueva contraseña")}"
      >

      <input
        id="resetConfirmPassword"
        type="password"
        class="swal2-input"
        placeholder="${loginT("login.confirmNewPassword", "Confirmar nueva contraseña")}"
      >
    `,

    showCancelButton: true,
    confirmButtonText: loginT("login.changePassword", "Cambiar contraseña"),
    cancelButtonText: loginT("login.cancel", "Cancelar"),

    confirmButtonColor: "#3c0000",
    cancelButtonColor: "#6b7280",

    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    focusConfirm: false,

    customClass: {
      popup: "danybot-password-change-popup",
      title: "danybot-password-reset-title",
      htmlContainer: "danybot-password-change-content",
      actions: "danybot-password-reset-actions",
      confirmButton: "danybot-password-reset-confirm",
      cancelButton: "danybot-password-reset-cancel"
    },

    preConfirm: async () => {
      const code = document.getElementById("resetPasswordCode").value.trim();
      const newPassword = document.getElementById("resetNewPassword").value;
      const confirmPassword = document.getElementById("resetConfirmPassword").value;

      if (!code || !newPassword || !confirmPassword) {
        Swal.showValidationMessage(loginT("login.completeResetData", "Completa el código y la nueva contraseña."));
        return false;
      }

      if (newPassword.length < 6) {
        Swal.showValidationMessage(loginT("login.passwordMinLength", "La contraseña debe tener al menos 6 caracteres."));
        return false;
      }

      if (newPassword !== confirmPassword) {
        Swal.showValidationMessage(loginT("login.passwordMismatch", "Las contraseñas no coinciden."));
        return false;
      }

      try {
        return await resetPassword(email, code, newPassword);
      } catch (error) {
        Swal.showValidationMessage(error.message);
        return false;
      }
    }
  });

  if (!resetResult.isConfirmed) {
    return;
  }

  await showAuthMessage({
    title: loginT("login.passwordUpdatedTitle", "Contraseña actualizada"),
    text: getLoginResponseText(resetResult.value, "login.passwordUpdatedText", "Ya puedes iniciar sesión con tu nueva contraseña."),
    icon: "success"
  });
}
// ===============================
// Login con Google
// Esta función debe quedar global porque Google la llama desde el HTML
// ===============================

async function handleCredentialResponse(response) {
  try {
    if (!response || !response.credential) {
      await showAuthMessage({
        title: loginT("login.loginFailedTitle", "No se pudo iniciar sesión"),
        text: loginT("login.googleNoCredential", "Google no devolvió una credencial válida."),
        icon: "error"
      });
      return;
    }

    const apiResponse = await fetch("/api/auth/google-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        credential: response.credential
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok || !data.user || !data.token) {
      await showAuthMessage({
        title: loginT("login.loginFailedTitle", "No se pudo iniciar sesión"),
        text: getLoginResponseText(data, "login.googleValidationError", "Ocurrió un error al validar tu cuenta de Google."),
        icon: "error"
      });
      return;
    }

    saveUserSession(data.user, data.token);

    await showAuthMessage({
      title: loginT("login.welcomeTitle", "Bienvenida"),
      text: data.message || `Hola ${data.user.name}, ingresaste correctamente.`,
      icon: "success"
    });

    if (
      typeof window.offerDanyBotBiometricAccess ===
      "function"
    ) {
      await window.offerDanyBotBiometricAccess(
        data.user,
        data.token
      );
    }

    redirectToDashboard();

  } catch (error) {
    console.error("Error en login con Google:", error);

    await showAuthMessage({
      title: "Error",
      text: loginT("login.googleLoginProblem", "Hubo un problema al iniciar sesión con Google."),
      icon: "error"
    });
  }
}

// Google necesita encontrar esta función en window
window.handleCredentialResponse = handleCredentialResponse;

// ===============================
// Login clásico con correo y contraseña
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const forgotPasswordButton = document.getElementById("forgotPasswordButton");

  if (forgotPasswordButton) {
    forgotPasswordButton.addEventListener("click", startForgotPasswordFlow);
  }

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      await showAuthMessage({
        title: loginT("login.incompleteTitle", "Datos incompletos"),
        text: loginT("login.enterEmailPassword", "Ingresa tu correo y contraseña."),
        icon: "warning"
      });
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok || !data.user || !data.token) {
        await showAuthMessage({
          title: loginT("login.loginFailedTitle", "No se pudo iniciar sesión"),
          text: getLoginResponseText(data, "login.invalidCredentials", "Correo o contraseña incorrectos."),
          icon: "error"
        });
        return;
      }

      saveUserSession(data.user, data.token);

      await showAuthMessage({
        title: loginT("login.welcomeTitle", "Bienvenida"),
        text: `${loginT("login.hello", "Hola")} ${data.user.name}, ${loginT("login.loginSuccessSuffix", "ingresaste correctamente.")}`,
        icon: "success"
      });

      if (
        typeof window.offerDanyBotBiometricAccess ===
        "function"
      ) {
        await window.offerDanyBotBiometricAccess(
          data.user,
          data.token
        );
      }

      redirectToDashboard();

    } catch (error) {
      console.error("Error en login clásico:", error);

      const apiDebug = window.DANYBOT_API_DEBUG || {};

      await showAuthMessage({
        title: "Error técnico",
        text: `
          ${error.message || "Error desconocido"}

          URL usada: ${apiDebug.lastUrl || "No detectada"}

          Origen: ${apiDebug.origin || "No detectado"}

          Protocolo: ${apiDebug.protocol || "No detectado"}

          Redirigió API: ${apiDebug.redirected ? "Sí" : "No"}
        `,
        icon: "error"
      });
    }
  });
});