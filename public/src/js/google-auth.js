const userData = localStorage.getItem("userData");

let user = null;

try {
  user = userData ? JSON.parse(userData) : null;
} catch (error) {
  console.error("Error al leer la sesión:", error);
  user = null;
}

if (!user || !user.id) {
  alert("⚠️ Sesión no iniciada. Por favor, inicia sesión.");
  window.location.href = "login_google.html";
  throw new Error("Sesión no iniciada");
}

const USER_ID = user.id;
  
  