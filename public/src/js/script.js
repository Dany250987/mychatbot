// ===============================
// Autenticación de usuarios
// Login con Google y login clásico
// ===============================

function showAuthMessage({ title, text, icon }) {
  if (typeof Swal !== "undefined") {
    return Swal.fire({
      title,
      text,
      icon,
      confirmButtonColor: "#3c0000"
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
    throw new Error(data.error || data.mensaje || "No se pudo cambiar la contraseña.");
  }

  return data;
}

async function startForgotPasswordFlow() {
  const emailResult = await Swal.fire({
    title: "Recuperar contraseña",
    text: "Ingresa el correo registrado en tu cuenta.",
    input: "email",
    inputPlaceholder: "correo@ejemplo.com",
    showCancelButton: true,
    confirmButtonText: "Enviar código",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#3c0000",
    cancelButtonColor: "#6b7280",
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async (email) => {
      const cleanEmail = String(email || "").trim().toLowerCase();

      if (!cleanEmail) {
        Swal.showValidationMessage("Ingresa tu correo.");
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
    title: "Código enviado",
    html: `
      <p>Enviamos un código de recuperación a:</p>
      <strong>${email}</strong>

      <input 
        id="resetPasswordCode" 
        class="swal2-input" 
        placeholder="Código de verificación"
        maxlength="6"
      >

      <input 
        id="resetNewPassword" 
        type="password" 
        class="swal2-input" 
        placeholder="Nueva contraseña"
      >

      <input 
        id="resetConfirmPassword" 
        type="password" 
        class="swal2-input" 
        placeholder="Confirmar nueva contraseña"
      >
    `,
    showCancelButton: true,
    confirmButtonText: "Cambiar contraseña",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#3c0000",
    cancelButtonColor: "#6b7280",
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    focusConfirm: false,
    preConfirm: async () => {
      const code = document.getElementById("resetPasswordCode").value.trim();
      const newPassword = document.getElementById("resetNewPassword").value;
      const confirmPassword = document.getElementById("resetConfirmPassword").value;

      if (!code || !newPassword || !confirmPassword) {
        Swal.showValidationMessage("Completa el código y la nueva contraseña.");
        return false;
      }

      if (newPassword.length < 6) {
        Swal.showValidationMessage("La contraseña debe tener al menos 6 caracteres.");
        return false;
      }

      if (newPassword !== confirmPassword) {
        Swal.showValidationMessage("Las contraseñas no coinciden.");
        return false;
      }

      try {
        const data = await resetPassword(email, code, newPassword);
        return data;
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
    title: "Contraseña actualizada",
    text: resetResult.value?.mensaje || "Ya puedes iniciar sesión con tu nueva contraseña.",
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
        title: "No se pudo iniciar sesión",
        text: "Google no devolvió una credencial válida.",
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
        title: "No se pudo iniciar sesión",
        text: data.message || data.error || "Ocurrió un error al validar tu cuenta de Google.",
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
    console.error("Error en login con Google:", error);

    await showAuthMessage({
      title: "Error",
      text: "Hubo un problema al iniciar sesión con Google.",
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
        title: "Datos incompletos",
        text: "Ingresa tu correo y contraseña.",
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
          title: "No se pudo iniciar sesión",
          text: data.error || data.message || "Correo o contraseña incorrectos.",
          icon: "error"
        });
        return;
      }

      saveUserSession(data.user, data.token);

      await showAuthMessage({
        title: "Bienvenida",
        text: `Hola ${data.user.name}, ingresaste correctamente.`,
        icon: "success"
      });

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
