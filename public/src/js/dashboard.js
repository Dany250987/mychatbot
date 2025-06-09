
  window.addEventListener("DOMContentLoaded", () => {
    const userData = localStorage.getItem("userData");

    if (!userData) {
      alert("⚠️ Sesión no iniciada. Por favor, inicia sesión.");
      window.location.href = "login_google_chatbot.html";
      return;
    }

    const user = JSON.parse(userData);

    const title = document.getElementById("section-title");
    const avatar = document.getElementById("user-avatar");

    if (title) {
      title.textContent = `Bienvenida, ${user.name} 💫`;
    }

    // Si el usuario viene de Google y tiene avatar
    if (user.picture && avatar) {
      avatar.src = user.picture;
      avatar.style.display = "block";
    }
  });

  function showSection(section) {
    const contentEl = document.getElementById("section-content");
    const sectionTitles = {
      tareas: "Tus tareas pendientes 📝",
      motivacion: "Un poco de motivación 💪",
      recordatorios: "Tus recordatorios ⏰",
      calendario: "Tu calendario 📅",
      crecimiento: "Crecimiento Personal 🌱",
      chistes: "Chistes del día 😂"
    };

    contentEl.innerHTML = `<h2>${sectionTitles[section] || "DanyBot"}</h2><p>Próximamente contenido aquí...</p>`;
  }

  function logout() {
    localStorage.removeItem("userData");
    window.location.href = "login_google_chatbot.html";
  }
