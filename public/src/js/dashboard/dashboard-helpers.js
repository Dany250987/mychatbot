function updateDateTime() {
  const datetime = document.getElementById("datetime");

  if (!datetime) {
    return;
  }

  const now = new Date();

  const formattedDate = now.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const formattedTime = now.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit"
  });

  datetime.textContent = `${formattedDate} · ${formattedTime}`;
}

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonthKey() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function formatDashboardMoney(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatDateForDatabase(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getReminderDateValue(dateValue) {
  if (!dateValue) {
    return "";
  }

  return String(dateValue).split("T")[0];
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bp\s*\.?\s*m\s*\.?\b/g, "pm")
    .replace(/\ba\s*\.?\s*m\s*\.?\b/g, "am")
    .replace(/\s+/g, " ")
    .trim();
}

function formatReminderTime(timeValue) {
  if (!timeValue) {
    return "Sin hora";
  }

  const [hour, minute] = timeValue.split(":");
  const date = new Date();
  date.setHours(Number(hour));
  date.setMinutes(Number(minute));

  return date.toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatRepeatType(repeatType) {
  const types = {
    una_vez: "Una vez",
    diario: "Diario",
    semanal: "Semanal",
    mensual: "Mensual",
    anual: "Anual"
  };

  return types[repeatType] || "Una vez";
}

function getRepeatTypeClass(repeatType) {
  const cleanRepeatType = repeatType || "una_vez";

  if (cleanRepeatType === "diario") {
    return "repeat-daily";
  }

  if (cleanRepeatType === "semanal") {
    return "repeat-weekly";
  }

  if (cleanRepeatType === "mensual") {
    return "repeat-monthly";
  }

  if (cleanRepeatType === "anual") {
    return "repeat-yearly";
  }

  return "repeat-once";
}

function getRepeatTypeIcon(repeatType) {
  const cleanRepeatType = repeatType || "una_vez";

  if (cleanRepeatType === "diario") {
    return "fa-sun";
  }

  if (cleanRepeatType === "semanal") {
    return "fa-calendar-week";
  }

  if (cleanRepeatType === "mensual") {
    return "fa-calendar-days";
  }

  if (cleanRepeatType === "anual") {
    return "fa-calendar-check";
  }

  return "fa-circle-dot";
}