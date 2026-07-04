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

    const googleUser = jwt_decode(response.credential);

    const userData = {
      name: googleUser.name,
      email: googleUser.email,
      picture: googleUser.picture
    };

    const apiResponse = await fetch("/api/auth/google-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(userData)
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

      await showAuthMessage({
        title: "Error",
        text: "Hubo un problema al intentar iniciar sesión.",
        icon: "error"
      });
    }
  });
});