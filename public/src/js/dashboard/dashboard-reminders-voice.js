// ===============================
// Seguridad con token para recordatorios por voz
// ===============================

function getVoiceReminderAuthToken() {
  return localStorage.getItem("authToken");
}

function getVoiceReminderAuthHeaders(includeJsonContent = false) {
  const token = getVoiceReminderAuthToken();

  const headers = {
    Authorization: `Bearer ${token}`
  };

  if (includeJsonContent) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function parseVoiceReminderJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

async function handleVoiceReminderUnauthorizedSession(data) {
  localStorage.removeItem("userData");
  localStorage.removeItem("authToken");

  const message = data?.error || data?.mensaje || "Tu sesión venció o no es válida. Inicia sesión nuevamente.";

  if (typeof Swal !== "undefined") {
    await Swal.fire({
      title: "Sesión vencida",
      text: message,
      icon: "warning",
      confirmButtonColor: "#960018"
    });
  } else {
    alert(message);
  }

  window.location.href = "login_google.html";
}


function getDateForTimeOnly(reminderTime) {
  const today = new Date();

  const [hour, minute] = reminderTime.split(":");

  const reminderDateTime = new Date();
  reminderDateTime.setHours(Number(hour));
  reminderDateTime.setMinutes(Number(minute));
  reminderDateTime.setSeconds(0);
  reminderDateTime.setMilliseconds(0);

  if (reminderDateTime < today) {
    reminderDateTime.setDate(reminderDateTime.getDate() + 1);
  }

  return formatDateForDatabase(reminderDateTime);
}

function detectReminderTitle(text) {
  let title = text.toLowerCase().trim();

  title = title
    .replace(/\b(crea|crear|agrega|agregar|anota|anotar|programa|programar)\b/g, "")
    .replace(/\b(recuerdame|recordarme|recordame|acuerdame|dejame|recordatorio|agenda)\b/g, "")
    .replace(/\b(quiero que me recuerdes|necesito que me recuerdes|me recuerdas|me recuerde)\b/g, "")
    .replace(/\b(que debo|debo|tengo que|necesito que|quiero que|quiero|para que|que)\b/g, "")
    .trim();

  title = extractTitleAfterDate(title);

  title = title
    .replace(/\ba las\s+\d{1,2}(?:(?::|\s+y\s+|\s+con\s+)\d{1,2})?\s*(de la manana|por la manana|de la tarde|de la noche|am|pm|a m|p m)?/g, "")
    .replace(/\b\d{1,2}(?:(?::|\s+y\s+|\s+con\s+)\d{1,2})\s*(am|pm|a m|p m)?\b/g, "")
    .replace(/\b\d{1,2}\s*(am|pm|a m|p m)\b/g, "")
    .replace(/\bhoy\b/g, "")
    .replace(/\bpasado manana\b/g, "")
    .replace(/\bmanana\b/g, "")
    .replace(/\b(el|los|las)?\s*(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/g, "")
    .replace(/\bpara el dia\s+\d{1,2}\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/g, "")
    .replace(/\bpara el\s+\d{1,2}\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/g, "")
    .replace(/\bel dia\s+\d{1,2}\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/g, "")
    .replace(/\bel\s+\d{1,2}\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/g, "")
    .replace(/\b\d{1,2}\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/g, "")
    .replace(/\bpara el dia\s+\d{1,2}\b/g, "")
    .replace(/\bpara el\s+\d{1,2}\b/g, "")
    .replace(/\bel dia\s+\d{1,2}\b/g, "")
    .replace(/\bel\s+\d{1,2}\b/g, "")
    .replace(/\btodos los dias\b/g, "")
    .replace(/\bcada dia\b/g, "")
    .replace(/\bdiariamente\b/g, "")
    .replace(/\ba diario\b/g, "")
    .replace(/\bcada semana\b/g, "")
    .replace(/\bsemanalmente\b/g, "")
    .replace(/\bsemanal\b/g, "")
    .replace(/\btodos los meses\b/g, "")
    .replace(/\bcada mes\b/g, "")
    .replace(/\bmensualmente\b/g, "")
    .replace(/\bmensual\b/g, "")
    .replace(/\bcada 1 mes\b/g, "")
    .replace(/\bcada un mes\b/g, "")
    .replace(/\buna vez al mes\b/g, "")
    .replace(/\buna vez por mes\b/g, "")
    .replace(/\btodos los anos\b/g, "")
    .replace(/\btodas los anos\b/g, "")
    .replace(/\bcada ano\b/g, "")
    .replace(/\banualmente\b/g, "")
    .replace(/\banual\b/g, "")
    .replace(/\bcada 1 ano\b/g, "")
    .replace(/\bcada un ano\b/g, "")
    .replace(/\buna vez al ano\b/g, "")
    .replace(/\buna vez por ano\b/g, "")
    .replace(/\bcada aniversario\b/g, "")
    .replace(/\bpara\s*$/g, "")
    .replace(/^para\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const fillerWords = [
    "por favor",
    "porfa",
    "favor",
    "me",
    "mi",
    "mis",
    "el",
    "la",
    "los",
    "las",
    "un",
    "una"
  ];

  fillerWords.forEach((word) => {
    title = title.replace(new RegExp(`^${word}\\s+`, "g"), "").trim();
  });

  if (!title || title.length <= 2) {
    return "Recordatorio";
  }

  const words = title.split(" ").filter(Boolean);

  if (words.length > 6) {
    title = words.slice(0, 6).join(" ");
  }

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function extractTitleAfterDate(text) {
  const monthNames = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";

  const dateBeforeActionMatch = text.match(
    new RegExp(`^(?:el dia\\s+|el\\s+|dia\\s+)?\\d{1,2}\\s*(?:de\\s+)?(${monthNames})\\s+para\\s+(.+)$`)
  );

  if (dateBeforeActionMatch) {
    return dateBeforeActionMatch[2].trim();
  }

  const relativeBeforeActionMatch = text.match(/^(hoy|manana|pasado manana)\s+(.+)$/);

  if (relativeBeforeActionMatch) {
    return relativeBeforeActionMatch[2].trim();
  }

  return text;
}

function detectReminderDate(text) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (text.includes("hoy")) {
    return formatDateForDatabase(todayStart);
  }

  if (text.includes("pasado manana")) {
    const date = new Date(todayStart);
    date.setDate(date.getDate() + 2);
    return formatDateForDatabase(date);
  }

  if (isTomorrowDateExpression(text)) {
    const date = new Date(todayStart);
    date.setDate(date.getDate() + 1);
    return formatDateForDatabase(date);
  }

  const explicitMonthDate = detectDateWithMonthName(text, todayStart);

  if (explicitMonthDate) {
    return explicitMonthDate;
  }

  const numericDate = detectNumericDate(text, todayStart);

  if (numericDate) {
    return numericDate;
  }

  const weekDays = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6
  };

  for (const dayName in weekDays) {
    if (text.includes(dayName)) {
      return getNextWeekdayDate(weekDays[dayName]);
    }
  }

  const dayMatch = text.match(/\b(?:para el dia|para el|el dia|el)\s+(\d{1,2})\b/);

  if (dayMatch) {
    const day = Number(dayMatch[1]);
    const date = new Date(todayStart);

    date.setDate(day);

    if (date < todayStart) {
      date.setMonth(date.getMonth() + 1);
    }

    return formatDateForDatabase(date);
  }

  return null;
}
function isTomorrowDateExpression(text) {
  const textWithoutMorningExpression = text
    .replace("de la manana", "")
    .replace("por la manana", "")
    .replace("en la manana", "");

  return textWithoutMorningExpression.includes("manana");
}

function getMonthNumber(monthName) {
  const months = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    setiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11
  };

  return months[monthName];
}

function detectDateWithMonthName(text, todayStart) {
  const monthNames = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";

  const dateMatch = text.match(
    new RegExp(`(?:el dia\\s+|el\\s+|dia\\s+)?(\\d{1,2})\\s*(?:de\\s+)?(${monthNames})\\b`)
  );

  if (!dateMatch) {
    return null;
  }

  const day = Number(dateMatch[1]);
  const month = getMonthNumber(dateMatch[2]);

  if (!isValidDayMonth(day, month)) {
    return null;
  }

  let year = todayStart.getFullYear();
  let date = new Date(year, month, day);

  if (date < todayStart) {
    year += 1;
    date = new Date(year, month, day);
  }

  return formatDateForDatabase(date);
}

function detectNumericDate(text, todayStart) {
  const numericDateMatch = text.match(/(?:el\s+)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);

  if (!numericDateMatch) {
    return null;
  }

  const day = Number(numericDateMatch[1]);
  const month = Number(numericDateMatch[2]) - 1;
  let year = numericDateMatch[3] ? Number(numericDateMatch[3]) : todayStart.getFullYear();

  if (year < 100) {
    year += 2000;
  }

  if (!isValidDayMonth(day, month)) {
    return null;
  }

  let date = new Date(year, month, day);

  if (!numericDateMatch[3] && date < todayStart) {
    date = new Date(year + 1, month, day);
  }

  return formatDateForDatabase(date);
}

function isValidDayMonth(day, month) {
  if (month < 0 || month > 11) {
    return false;
  }

  if (day < 1 || day > 31) {
    return false;
  }

  const testDate = new Date(2028, month, day);

  return testDate.getMonth() === month && testDate.getDate() === day;
}

function detectReminderTime(text, reminderDate = null) {
  let hour = null;
  let minutes = 0;

  const cleanText = normalizeText(text);

  const timeWithLasMatch = cleanText.match(
    /a las\s+(\d{1,2})(?:(?::|\s+y\s+|\s+con\s+)(\d{1,2}))?\s*(am|pm)?\b/
  );

  const timeWithoutLasMatch = cleanText.match(
    /\b(\d{1,2})(?:(?::|\s+y\s+|\s+con\s+)(\d{1,2}))\s*(am|pm)?\b/
  );

  const simpleAmPmMatch = cleanText.match(
    /\b(\d{1,2})\s*(am|pm)\b/
  );

  const simpleHourWithDayPartMatch = cleanText.match(
    /\b(\d{1,2})\s*(de la manana|por la manana|de la tarde|de la noche)\b/
  );

  if (timeWithLasMatch) {
    hour = Number(timeWithLasMatch[1]);
    minutes = timeWithLasMatch[2] ? Number(timeWithLasMatch[2]) : 0;
  } else if (timeWithoutLasMatch) {
    hour = Number(timeWithoutLasMatch[1]);
    minutes = timeWithoutLasMatch[2] ? Number(timeWithoutLasMatch[2]) : 0;
  } else if (simpleAmPmMatch) {
    hour = Number(simpleAmPmMatch[1]);
    minutes = 0;
  } else if (simpleHourWithDayPartMatch) {
    hour = Number(simpleHourWithDayPartMatch[1]);
    minutes = 0;
  } else {
    const spokenHour = detectSpokenHour(cleanText);

    if (!spokenHour) {
      return null;
    }

    hour = spokenHour;
  }

  if (hour < 1 || hour > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const saysPm =
    cleanText.includes("de la tarde") ||
    cleanText.includes("de la noche") ||
    /\bpm\b/.test(cleanText);

  const saysAm =
    cleanText.includes("de la manana") ||
    cleanText.includes("por la manana") ||
    /\bam\b/.test(cleanText);

  if (saysPm && hour < 12) {
    hour += 12;
  }

  if (saysAm && hour === 12) {
    hour = 0;
  }

  const isToday =
    reminderDate === getTodayDate() ||
    cleanText.includes("hoy");

  if (!saysPm && !saysAm && isToday && hour >= 1 && hour <= 11) {
    const now = new Date();

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const morningAlreadyPassed =
      currentHour > hour ||
      (currentHour === hour && currentMinute >= minutes);

    if (morningAlreadyPassed || currentHour >= 12) {
      hour += 12;
    }
  }

  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function detectSpokenHour(text) {
  const hourWords = {
    una: 1,
    uno: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12
  };

  const spokenMatch = text.match(/a las\s+(una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b/);

  if (!spokenMatch) {
    return null;
  }

  return hourWords[spokenMatch[1]];
}

function detectReminderCategory(text) {
  const financeWords = ["pagar", "factura", "arriendo", "tarjeta", "internet", "servicio", "gasto", "ahorro"];
  const studyWords = ["estudiar", "repasar", "curso", "clase", "backend", "frontend", "ingles"];
  const healthWords = ["medico", "cita", "doctor", "salud", "medicina", "ejercicio"];
  const workWords = ["reunion", "informe", "correo", "ticket", "trabajo", "cliente"];

  if (financeWords.some((word) => text.includes(word))) {
    return "Finanzas";
  }

  if (studyWords.some((word) => text.includes(word))) {
    return "Estudio";
  }

  if (healthWords.some((word) => text.includes(word))) {
    return "Salud";
  }

  if (workWords.some((word) => text.includes(word))) {
    return "Trabajo";
  }

  return "Personal";
}

function detectRepeatType(text) {
  const cleanText = normalizeText(text);

  const dailyPatterns = [
    "todos los dias",
    "todas los dias",
    "cada dia",
    "diariamente",
    "a diario",
    "todos los dias de la semana"
  ];

  const weeklyPatterns = [
    "cada semana",
    "semanal",
    "semanalmente",
    "todas las semanas",
    "todos los lunes",
    "todos los martes",
    "todos los miercoles",
    "todos los jueves",
    "todos los viernes",
    "todos los sabados",
    "todos los domingos",
    "cada lunes",
    "cada martes",
    "cada miercoles",
    "cada jueves",
    "cada viernes",
    "cada sabado",
    "cada domingo"
  ];

  const monthlyPatterns = [
    "cada mes",
    "cada mensualidad",
    "mensual",
    "mensualmente",
    "todos los meses",
    "cada 1 mes",
    "cada un mes",
    "una vez al mes",
    "una vez por mes",
    "mes a mes"
  ];

  const yearlyPatterns = [
    "cada ano",
    "anualmente",
    "anual",
    "todos los anos",
    "todas los anos",
    "cada 1 ano",
    "cada un ano",
    "una vez al ano",
    "una vez por ano",
    "ano a ano",
    "cada aniversario"
  ];

  if (dailyPatterns.some((pattern) => cleanText.includes(pattern))) {
    return "diario";
  }

  if (weeklyPatterns.some((pattern) => cleanText.includes(pattern))) {
    return "semanal";
  }

  if (monthlyPatterns.some((pattern) => cleanText.includes(pattern))) {
    return "mensual";
  }

  if (yearlyPatterns.some((pattern) => cleanText.includes(pattern))) {
    return "anual";
  }

  return "una_vez";
}

function getNextWeekdayDate(targetDay) {
  const date = new Date();
  const currentDay = date.getDay();

  let daysUntilTarget = targetDay - currentDay;

  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7;
  }

  date.setDate(date.getDate() + daysUntilTarget);

  return formatDateForDatabase(date);
}


async function saveVoiceReminder(reminderData) {
  const token = getVoiceReminderAuthToken();

  if (!token) {
    await handleVoiceReminderUnauthorizedSession({
      mensaje: "No se encontró token de sesión."
    });
    return;
  }

  try {
    const response = await fetch(REMINDERS_API_URL, {
      method: "POST",
      headers: getVoiceReminderAuthHeaders(true),
      body: JSON.stringify(reminderData)
    });

    const data = await parseVoiceReminderJsonResponse(response);

    if (response.status === 401) {
      await handleVoiceReminderUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      Swal.fire({
        title: "No se pudo guardar",
        text: data.mensaje || "No se pudo guardar el recordatorio.",
        icon: "error",
        confirmButtonColor: "#960018"
      });
      return;
    }

    await Swal.fire({
      title: "Recordatorio creado",
      text: "Tu recordatorio fue guardado correctamente.",
      icon: "success",
      confirmButtonColor: "#960018"
    });

    const createdReminderId = data.reminder_id;

    if (typeof pendingCreatedReminderId !== "undefined") {
      pendingCreatedReminderId = createdReminderId;
    }

    if (typeof currentReminderFilter !== "undefined") {
      currentReminderFilter = "activos";
    }

    if (typeof showSection === "function") {
      window.location.hash = "recordatorios";
      showSection("recordatorios");
    } else {
      await loadReminders();
    }

    if (typeof scrollToCreatedReminderCard === "function") {
      scrollToCreatedReminderCard(createdReminderId);
    }

  } catch (error) {
    console.error("Error al guardar recordatorio:", error);

    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al guardar el recordatorio.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  }
}

async function startVoiceReminder() {
  const statusText = document.getElementById("voiceReminderStatus");
  const voiceButton = document.getElementById("voiceReminderButton");

  const isMobileApp =
    typeof window.isDanyBotRunningInMobileApp === "function" &&
    window.isDanyBotRunningInMobileApp();

  if (isMobileApp) {
    if (typeof window.startDanyBotNativeSpeech !== "function") {
      Swal.fire({
        title: "Voz no disponible",
        text: "No se encontró la configuración de voz nativa.",
        icon: "warning",
        confirmButtonColor: "#960018"
      });
      return;
    }

    try {
      if (statusText) {
        statusText.textContent = "Escuchando... di tu recordatorio completo.";
      }

      if (voiceButton) {
        voiceButton.classList.add("listening");
        voiceButton.innerHTML = `<i class="fa-solid fa-microphone-lines"></i>`;
      }

      const result = await window.startDanyBotNativeSpeech({
        language: "es-CO",
        prompt: "Di el recordatorio que quieres crear"
      });

      if (voiceButton) {
        voiceButton.classList.remove("listening");
        voiceButton.innerHTML = `<i class="fa-solid fa-microphone"></i>`;
      }

      if (!result.success) {
        if (statusText) {
          statusText.textContent = "No pude escuchar bien. Intenta de nuevo.";
        }

        Swal.fire({
          title: "No se pudo escuchar",
          text: result.reason || "No se detectó ningún texto.",
          icon: "warning",
          confirmButtonColor: "#960018"
        });
        return;
      }

      const spokenText = result.text.toLowerCase();

      if (statusText) {
        statusText.textContent = `"${spokenText}"`;
      }

      await processCompletedVoiceReminder(spokenText);

      return;

    } catch (error) {
      console.error("Error en voz nativa de recordatorios:", error);

      if (voiceButton) {
        voiceButton.classList.remove("listening");
        voiceButton.innerHTML = `<i class="fa-solid fa-microphone"></i>`;
      }

      if (statusText) {
        statusText.textContent = "No se pudo usar el micrófono.";
      }

      Swal.fire({
        title: "Error de voz",
        text: "No fue posible usar el micrófono del celular.",
        icon: "error",
        confirmButtonColor: "#960018"
      });

      return;
    }
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    Swal.fire({
      title: "Micrófono no compatible",
      text: "Tu navegador no soporta reconocimiento de voz. Prueba en Google Chrome.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "es-CO";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalTranscript = "";
  let interimTranscript = "";
  let silenceTimer = null;
  let maxListenTimer = null;
  let alreadyProcessed = false;

  function getFullTranscript() {
    return `${finalTranscript} ${interimTranscript}`
      .replace(/\s+/g, " ")
      .trim();
  }

  function resetVoiceButton() {
    if (voiceButton) {
      voiceButton.classList.remove("listening");
      voiceButton.innerHTML = `<i class="fa-solid fa-microphone"></i>`;
    }
  }

  function clearVoiceTimers() {
    clearTimeout(silenceTimer);
    clearTimeout(maxListenTimer);
  }

  async function finishVoiceReminder() {
    if (alreadyProcessed) {
      return;
    }

    alreadyProcessed = true;
    clearVoiceTimers();
    resetVoiceButton();

    try {
      recognition.stop();
    } catch (error) {
      console.warn("El reconocimiento ya estaba detenido.");
    }

    const spokenText = getFullTranscript();

    if (!spokenText) {
      if (statusText) {
        statusText.textContent = "No detecté texto. Intenta de nuevo.";
      }

      return;
    }

    if (statusText) {
      statusText.textContent = `"${spokenText}"`;
    }

    await processCompletedVoiceReminder(spokenText);
  }

  if (statusText) {
    statusText.textContent = "Escuchando... habla tu recordatorio completo.";
  }

  if (voiceButton) {
    voiceButton.classList.add("listening");
    voiceButton.innerHTML = `<i class="fa-solid fa-microphone-lines"></i>`;
  }

  try {
    recognition.start();
  } catch (error) {
    resetVoiceButton();

    Swal.fire({
      title: "No se pudo iniciar el micrófono",
      text: "Intenta nuevamente.",
      icon: "error",
      confirmButtonColor: "#960018"
    });

    return;
  }

  maxListenTimer = setTimeout(() => {
    finishVoiceReminder();
  }, 15000);

  recognition.onresult = (event) => {
    interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcriptPart = event.results[i][0].transcript.trim();

      if (event.results[i].isFinal) {
        finalTranscript += ` ${transcriptPart}`;
      } else {
        interimTranscript += ` ${transcriptPart}`;
      }
    }

    const visibleText = getFullTranscript();

    if (statusText) {
      statusText.textContent = visibleText
        ? `"${visibleText}"`
        : "Escuchando... habla tu recordatorio completo.";
    }

    clearTimeout(silenceTimer);

    silenceTimer = setTimeout(() => {
      finishVoiceReminder();
    }, 2500);
  };

  recognition.onerror = () => {
    alreadyProcessed = true;
    clearVoiceTimers();
    resetVoiceButton();

    if (statusText) {
      statusText.textContent = "No pude escuchar bien. Intenta de nuevo.";
    }

    Swal.fire({
      title: "No se pudo escuchar",
      text: "Revisa el permiso del micrófono o intenta nuevamente.",
      icon: "error",
      confirmButtonColor: "#960018"
    });
  };

  recognition.onend = () => {
    if (!alreadyProcessed) {
      finishVoiceReminder();
    }
  };
}

async function processCompletedVoiceReminder(spokenText) {
  const detectedReminder = parseReminderFromVoice(spokenText);

  lastDetectedReminder = detectedReminder;

  renderDetectedReminder(detectedReminder);

  if (!detectedReminder.reminder_date) {
    Swal.fire({
      title: "Falta la fecha",
      text: "No pude detectar una fecha clara. Intenta decir algo como: recuérdame pagar internet mañana a las 8 de la noche.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  if (!detectedReminder.reminder_time) {
    Swal.fire({
      title: "Falta la hora",
      text: "Para poder avisarte, necesito una hora. Intenta decir algo como: hoy a las 4:54 de la tarde.",
      icon: "warning",
      confirmButtonColor: "#960018"
    });
    return;
  }

  await saveVoiceReminder(detectedReminder);
}

function parseReminderFromVoice(text) {
  const originalText = text;
  const normalizedText = normalizeText(text);

  let reminderDate = detectReminderDate(normalizedText);
  let reminderTime = detectReminderTime(normalizedText, reminderDate || getTodayDate());

  if (!reminderDate && reminderTime) {
    reminderDate = getDateForTimeOnly(reminderTime);
    reminderTime = detectReminderTime(normalizedText, reminderDate);
  }

  const category = detectReminderCategory(normalizedText);
  const repeatType = detectRepeatType(normalizedText);
  const title = detectReminderTitle(normalizedText);

  return {
    title,
    original_text: originalText,
    reminder_date: reminderDate,
    reminder_time: reminderTime,
    category,
    repeat_type: repeatType,
    status: "activo"
  };
}