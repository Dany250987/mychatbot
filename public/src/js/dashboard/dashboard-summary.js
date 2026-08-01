// ===============================
// Seguridad con token para el resumen del dashboard
// ===============================

function getDashboardSummaryAuthToken() {
  return localStorage.getItem("authToken");
}

function getDashboardSummaryAuthHeaders() {
  const token = getDashboardSummaryAuthToken();

  return {
    Authorization: `Bearer ${token}`
  };
}

async function parseDashboardSummaryJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

async function handleDashboardSummaryUnauthorizedSession(data) {
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



// ===============================
// Contadores de recordatorios
// ===============================

function updateDashboardRemindersCount() {
  const totalActivitiesCount = document.getElementById("totalTasksCount");
  const pendingActivitiesCount = document.getElementById("pendingTasksCount");
  const scheduledAlertsCount = document.getElementById("activeRemindersCount");

  const today = typeof getTodayDate === "function"
    ? getTodayDate()
    : new Date().toISOString().slice(0, 10);

  const isVisibleActivity = (reminder) => {
    if (!reminder) {
      return false;
    }

    if (reminder.status === "papelera" || reminder.status === "completado") {
      return false;
    }

    if (typeof shouldShowReminderOnBoard === "function") {
      return shouldShowReminderOnBoard(reminder, today);
    }

    return true;
  };

  const visibleActivities = reminders.filter(isVisibleActivity);

  const pendingActivities = visibleActivities.filter((reminder) => {
    return reminder.status === "activo";
  });

  const scheduledAlerts = visibleActivities.filter((reminder) => {
    return reminder.status === "activo"
      && reminder.reminder_date
      && reminder.reminder_time;
  });

  if (totalActivitiesCount) {
    totalActivitiesCount.textContent = visibleActivities.length;
  }

  if (pendingActivitiesCount) {
    pendingActivitiesCount.textContent = pendingActivities.length;
  }

  if (scheduledAlertsCount) {
    scheduledAlertsCount.textContent = scheduledAlerts.length;
  }
}

/* ===== INICIO HOME MOVIL DATOS ===== */

function updateDashboardMobileHome() {
  const dailyTasksCount = document.getElementById("dailyTasksCount");
  const dailyEventsCount = document.getElementById("dailyEventsCount");
  const dailyRemindersCount = document.getElementById("dailyRemindersCount");

  const today = typeof getTodayDate === "function"
    ? getTodayDate()
    : new Date().toISOString().slice(0, 10);

  const visibleActivities = reminders.filter((reminder) => {
    if (!reminder) {
      return false;
    }

    if (reminder.status === "papelera" || reminder.status === "completado") {
      return false;
    }

    return true;
  });

  const pendingActivities = visibleActivities.filter((reminder) => {
    return reminder.status === "activo";
  });

  const todayActivities = visibleActivities.filter((reminder) => {
    return reminder.status === "activo"
      && getReminderDateValue(reminder.reminder_date) === today;
  });

  const scheduledAlerts = visibleActivities.filter((reminder) => {
    return reminder.status === "activo"
      && reminder.reminder_date
      && reminder.reminder_time;
  });

  if (dailyTasksCount) {
    dailyTasksCount.textContent = pendingActivities.length;
  }

  if (dailyEventsCount) {
    dailyEventsCount.textContent = todayActivities.length;
  }

  if (dailyRemindersCount) {
    dailyRemindersCount.textContent = scheduledAlerts.length;
  }

  renderDashboardUpcomingActivities(pendingActivities);
}

function renderDashboardUpcomingActivities(activityList = []) {
  const container = document.getElementById("dashboardUpcomingActivities");

  if (!container) {
    return;
  }

  const today = typeof getTodayDate === "function"
    ? getTodayDate()
    : new Date().toISOString().slice(0, 10);

  const upcomingActivities = [...activityList]
    .filter((reminder) => {
      const reminderDate = getReminderDateValue(reminder.reminder_date);

      return reminder.status === "activo"
        && reminderDate
        && reminderDate >= today;
    })
    .sort((a, b) => {
      const dateA = `${getReminderDateValue(a.reminder_date)} ${a.reminder_time || "23:59:59"}`;
      const dateB = `${getReminderDateValue(b.reminder_date)} ${b.reminder_time || "23:59:59"}`;

      return dateA.localeCompare(dateB);
    })
    .slice(0, 3);

  if (upcomingActivities.length === 0) {
    container.innerHTML = `
      <div class="dashboard-empty-state">
        <div class="dashboard-empty-icon">
          <i class="fa-solid fa-calendar-check"></i>
        </div>

        <div>
          <h3>Tu agenda aparecerá aquí</h3>
          <p>Las actividades más próximas se mostrarán en esta sección.</p>
        </div>
      </div>
    `;

    return;
  }

  container.innerHTML = upcomingActivities
    .map((reminder) => {
      const title = escapeDashboardHomeHtml(
        reminder.title
        || reminder.original_text
        || "Actividad"
      );

      const dateLabel = formatDashboardHomeActivityDate(reminder);
      const typeLabel = getDashboardHomeTypeLabel(reminder);
      const iconClass = getDashboardHomeIcon(reminder);
      const typeClass = getDashboardHomeTypeClass(reminder);

      return `
        <a
          class="dashboard-upcoming-item"
          href="./dashboard.html?type=reminder&id=${encodeURIComponent(reminder.id)}&status=${encodeURIComponent(reminder.status || "activo")}#recordatorios"
          aria-label="Abrir actividad: ${title}"
        >
          <span class="dashboard-upcoming-dot ${typeClass}"></span>

          <span class="dashboard-upcoming-icon ${typeClass}">
            <i class="fa-solid ${iconClass}"></i>
          </span>

          <div class="dashboard-upcoming-info">
            <h3>${title}</h3>
            <p>${dateLabel}</p>
          </div>

          <span class="dashboard-upcoming-type ${typeClass}">
            ${typeLabel}
          </span>
        </a>
      `;
    })
    .join("");
}

function formatDashboardHomeActivityDate(reminder) {
  const reminderDate = getReminderDateValue(reminder.reminder_date);
  const reminderTime = reminder.reminder_time
    ? reminder.reminder_time.substring(0, 5)
    : "";

  const today = getTodayDate();

  const tomorrowDate = new Date(`${today}T00:00:00`);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  const tomorrow = [
    tomorrowDate.getFullYear(),
    String(tomorrowDate.getMonth() + 1).padStart(2, "0"),
    String(tomorrowDate.getDate()).padStart(2, "0")
  ].join("-");

  let dateText = "";

  if (reminderDate === today) {
    dateText = "Hoy";
  } else if (reminderDate === tomorrow) {
    dateText = "Mañana";
  } else {
    const date = new Date(`${reminderDate}T00:00:00`);

    dateText = date.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short"
    }).replace(".", "");
  }

  if (!reminderTime) {
    return dateText;
  }

  const [hourValue, minuteValue] = reminderTime.split(":");
  const hour = Number(hourValue);
  const suffix = hour >= 12 ? "p. m." : "a. m.";
  const formattedHour = hour % 12 || 12;

  return `${dateText}, ${formattedHour}:${minuteValue} ${suffix}`;
}

function getDashboardHomeIcon(reminder) {
  const category = String(reminder.category || "").toLowerCase();

  if (category.includes("finanz")) {
    return "fa-wallet";
  }

  if (category.includes("estudio")) {
    return "fa-book";
  }

  if (category.includes("trabajo")) {
    return "fa-briefcase";
  }

  if (category.includes("salud")) {
    return "fa-heart-pulse";
  }

  return "fa-bell";
}

function getDashboardHomeTypeLabel(reminder) {
  const category = String(reminder.category || "").trim();

  if (category) {
    return escapeDashboardHomeHtml(category);
  }

  return reminder.reminder_time ? "Aviso" : "Actividad";
}

function getDashboardHomeTypeClass(reminder) {
  const category = String(reminder.category || "").toLowerCase();

  if (
    category.includes("finanz")
    || category.includes("pago")
    || category.includes("dinero")
    || category.includes("gasto")
  ) {
    return "dashboard-type-finance";
  }

  if (
    category.includes("estudio")
    || category.includes("curso")
    || category.includes("universidad")
  ) {
    return "dashboard-type-study";
  }

  if (
    category.includes("trabajo")
    || category.includes("laboral")
    || category.includes("oficina")
  ) {
    return "dashboard-type-work";
  }

  return "dashboard-type-default";
}

function escapeDashboardHomeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ===== FIN HOME MOVIL DATOS ===== */

function updateDashboardTodayEventsCount() {
  const todayEventsCount = document.getElementById("todayEventsCount");

  if (!todayEventsCount) {
    return;
  }

  const today = getTodayDate();

  const todayReminders = reminders.filter((reminder) => {
    return getReminderDateValue(reminder.reminder_date) === today
      && reminder.status === "activo";
  });

  todayEventsCount.textContent = todayReminders.length;
  updateDashboardMobileHome();
}




// ===============================
// Cargar recordatorios del dashboard
// ===============================

async function loadDashboardRemindersCount() {
  const token = getDashboardSummaryAuthToken();

  if (!token) {
    await handleDashboardSummaryUnauthorizedSession({
      mensaje: "No se encontró token de sesión."
    });
    return;
  }

  try {
    const response = await fetch(REMINDERS_API_URL, {
      headers: getDashboardSummaryAuthHeaders()
    });

    const data = await parseDashboardSummaryJsonResponse(response);

    if (response.status === 401) {
      await handleDashboardSummaryUnauthorizedSession(data);
      return;
    }

    if (!response.ok) {
      console.error("No se pudieron cargar los recordatorios del dashboard:", data);
      updateDashboardRemindersCount();
      updateDashboardTodayEventsCount();
      return;
    }

    reminders = data.reminders || [];

    updateDashboardRemindersCount();
    updateDashboardTodayEventsCount();

  } catch (error) {
    console.error("Error al cargar el contador de recordatorios:", error);
    updateDashboardRemindersCount();
    updateDashboardTodayEventsCount();
  }
}


// ===============================
// Tarjetas financieras
// ===============================

function updateDashboardFinancialCards(monthlyExpenses, monthlyIncome, monthlySavings) {
  const monthlyExpensesAmount = document.getElementById("monthlyExpensesAmount");
  const monthlyIncomeAmount = document.getElementById("monthlyIncomeAmount");
  const monthlySavingsAmount = document.getElementById("monthlySavingsAmount");

  if (monthlyExpensesAmount) {
    monthlyExpensesAmount.textContent = formatDashboardMoney(monthlyExpenses);
  }

  if (monthlyIncomeAmount) {
    monthlyIncomeAmount.textContent = formatDashboardMoney(monthlyIncome);
  }

  if (monthlySavingsAmount) {
    monthlySavingsAmount.textContent = formatDashboardMoney(monthlySavings);

    monthlySavingsAmount.classList.remove("positive-saving", "negative-saving");

    if (monthlySavings >= 0) {
      monthlySavingsAmount.classList.add("positive-saving");
    } else {
      monthlySavingsAmount.classList.add("negative-saving");
    }
  }
}


// ===============================
// Cargar resumen financiero del dashboard
// ===============================

async function loadDashboardFinancialSummary() {
  const token = getDashboardSummaryAuthToken();

  if (!token) {
    await handleDashboardSummaryUnauthorizedSession({
      mensaje: "No se encontró token de sesión."
    });
    return;
  }

  const selectedMonth = getCurrentMonthKey();

  let monthlyExpenses = 0;
  let mainIncome = 0;
  let additionalIncome = 0;

  try {
    const expensesResponse = await fetch(EXPENSES_API_URL, {
      headers: getDashboardSummaryAuthHeaders()
    });

    const expensesData = await parseDashboardSummaryJsonResponse(expensesResponse);

    if (expensesResponse.status === 401) {
      await handleDashboardSummaryUnauthorizedSession(expensesData);
      return;
    }

    if (expensesResponse.ok) {
      const expenses = expensesData.gastos || [];

      const currentMonthExpenses = expenses.filter((expense) => {
        const expenseDate = String(expense.expense_date).split("T")[0];
        const expenseMonth = expenseDate.slice(0, 7);

        return expenseMonth === selectedMonth;
      });

      monthlyExpenses = currentMonthExpenses.reduce((total, expense) => {
        return total + Number(expense.amount || 0);
      }, 0);
    } else {
      console.error("No se pudieron cargar gastos del dashboard:", expensesData);
    }

  } catch (error) {
    console.error("Error al cargar gastos del dashboard:", error);
  }

  try {
    const incomeResponse = await fetch(`${INCOMES_API_URL}?month=${selectedMonth}`, {
      headers: getDashboardSummaryAuthHeaders()
    });

    const incomeData = await parseDashboardSummaryJsonResponse(incomeResponse);

    if (incomeResponse.status === 401) {
      await handleDashboardSummaryUnauthorizedSession(incomeData);
      return;
    }

    if (incomeResponse.ok && incomeData.income) {
      mainIncome = Number(incomeData.income.amount || 0);
    } else {
      console.error("No se pudo cargar ingreso principal del dashboard:", incomeData);
    }

  } catch (error) {
    console.error("Error al cargar ingreso mensual del dashboard:", error);
  }

  try {
    const additionalIncomeResponse = await fetch(`${INCOMES_API_URL}/additional?month=${selectedMonth}`, {
      headers: getDashboardSummaryAuthHeaders()
    });

    const additionalIncomeData = await parseDashboardSummaryJsonResponse(additionalIncomeResponse);

    if (additionalIncomeResponse.status === 401) {
      await handleDashboardSummaryUnauthorizedSession(additionalIncomeData);
      return;
    }

    if (additionalIncomeResponse.ok) {
      const additionalIncomes = additionalIncomeData.additionalIncomes || [];

      additionalIncome = additionalIncomes.reduce((total, income) => {
        return total + Number(income.amount || 0);
      }, 0);
    } else {
      console.error("No se pudieron cargar ingresos adicionales del dashboard:", additionalIncomeData);
    }

  } catch (error) {
    console.error("Error al cargar ingresos adicionales del dashboard:", error);
  }

  const totalIncome = additionalIncome;
  const monthlySavings = totalIncome - monthlyExpenses;

  updateDashboardFinancialCards(monthlyExpenses, totalIncome, monthlySavings);
}