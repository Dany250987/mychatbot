// ✅ Login con Google
function handleCredentialResponse(response) {
  const data = jwt_decode(response.credential);
  console.log("✅ Datos recibidos de Google:", data);

  const name = data.name;
  const email = data.email;
  const picture = data.picture;

  fetch("/api/auth/google-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, email, picture })
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("📥 Respuesta del backend:", data);
      alert(data.message);

      // Guardar y redirigir
      localStorage.setItem("userData", JSON.stringify(data.user));
      window.location.href = "dashboard.html";
    })
    .catch((err) => {
      console.error("❌ Error al enviar a la API:", err);
    });
}

// ✅ Login clásico con email y contraseña
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (!form) return; // Protección extra

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ Bienvenido " + data.user.name);
        localStorage.setItem("userData", JSON.stringify(data.user));
        window.location.href = "dashboard.html";
      } else {
        alert(data.error || "Correo o contraseña incorrectos");
      }

    } catch (error) {
      console.error("❌ Error en login clásico:", error);
      alert("Hubo un problema al intentar iniciar sesión.");
    }
  });
});
