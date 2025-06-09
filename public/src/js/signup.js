const input = document.querySelector("#phone");
const LOGIN_PAGE = "login_google_chatbot.html";


window.intlTelInput(input, {
  initialCountry: "auto",
  geoIpLookup: function(callback) {
    fetch('https://ipapi.co/json')
      .then(res => res.json())
      .then(data => callback(data.country_code))
      .catch(() => callback('us'));
  },
  utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.1.1/build/js/utils.js"
});

// 👇 Lógica de envío del formulario
document.getElementById("btn-submit").addEventListener("click", async (e) => {
  e.preventDefault();

  console.log("🚀 Formulario enviado");

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const date_of_birth = document.getElementById("date-of-birth").value;
  const phone_number = document.getElementById("phone").value;
  const password = document.getElementById("password").value;
  const confirm_password = document.getElementById("confirm-password").value;

  console.log("📝 Datos capturados:", {
    name, email, date_of_birth, phone_number, password, confirm_password
  });

  if (password !== confirm_password) {
    alert("Las contraseñas no coinciden");
    console.warn("⚠️ Contraseñas no coinciden");
    return;
  }

  try {
    console.log("📦 Enviando datos al servidor...");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password, date_of_birth, phone_number })
    });

    const data = await response.json();
    console.log("📬 Respuesta del servidor:", data);


  if (response.ok) {
    // Puedes guardar datos si quieres
    localStorage.setItem("userEmail", email); // opcional
    window.location.href = LOGIN_PAGE; 
  } else {
    alert(data.error || "Ocurrió un error al registrarte.");
  }


  } catch (error) {
    console.error("❌ Error en la solicitud:", error);
    alert("Error al enviar datos. Revisa la consola.");
  }
});


function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  const icon = button.querySelector("i");

  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}


