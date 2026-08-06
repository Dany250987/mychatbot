/*
 * Interfaz exclusiva de Actividades para la aplicación móvil.
 *
 * La versión web conserva su estructura actual.
 */

function isDanyBotActivitiesMobileApp() {
  return (
    document.documentElement.classList.contains(
      'danybot-mobile-app'
    ) ||
    document.body.classList.contains(
      'danybot-mobile-app'
    )
  );
}


function updateDanyBotActivitiesMobileView() {
  if (!isDanyBotActivitiesMobileApp()) {
    return;
  }

  const isActivitiesView =
    window.location.hash === '#recordatorios';

  document.documentElement.classList.toggle(
    'danybot-activities-view',
    isActivitiesView
  );
}


function createMobileActivityCard(reminder) {
  const card = document.createElement('article');

  const detailId =
    `mobileActivityDetails-${reminder.id}`;

  const categoryClass =
    getReminderCategoryClass(reminder.category);

  const statusClass =
  getReminderStatusClass(reminder);

  const priorityClass =
    reminder.priority === 'alta'
      ? 'mobile-activity-priority-high'
      : reminder.priority === 'baja'
        ? 'mobile-activity-priority-low'
        : 'mobile-activity-priority-medium';

  card.className = [
    'mobile-activity-card',
    categoryClass,
    `mobile-activity-status-${statusClass}`,
    priorityClass
  ].join(' ');

  card.dataset.reminderId = reminder.id;

  card.innerHTML = `
    <button
      type="button"
      class="mobile-activity-summary"
      aria-expanded="false"
      aria-controls="${detailId}"
    >
      <span class="mobile-activity-icon">
        <i
          class="fa-solid ${getReminderCategoryIcon(
            reminder.category
          )}"
        ></i>
      </span>

      <span class="mobile-activity-main">
        <strong class="mobile-activity-title">
          ${reminder.title}
        </strong>

        <span class="mobile-activity-meta">
          <span>
            ${reminder.category || 'Personal'}
          </span>

          <span>
            ${formatRepeatType(reminder.repeat_type)}
          </span>
        </span>
      </span>

      <span
        class="mobile-activity-status ${statusClass}"
      >
        ${getReminderStatusLabel(reminder)}
      </span>

      <i
        class="fa-solid fa-chevron-down mobile-activity-chevron"
        aria-hidden="true"
      ></i>
    </button>

    <div
      id="${detailId}"
      class="mobile-activity-details"
      hidden
    >
      <div class="mobile-activity-priority">
        <span
          class="activity-priority-pill ${getActivityPriorityClass(
            reminder.priority
          )}"
        >
          <i class="fa-solid fa-flag"></i>
          ${getActivityPriorityLabel(reminder.priority)}
        </span>
      </div>

      <p class="mobile-activity-description">
        ${getActivityDescription(reminder)}
      </p>

      <div class="mobile-activity-detail-grid">
        <div class="mobile-activity-detail">
          <span>Fecha límite</span>

          <strong>
            <i class="fa-solid fa-calendar-check"></i>
            ${getActivityDueDateLabel(reminder)}
          </strong>
        </div>

        <div class="mobile-activity-detail">
          <span>Aviso</span>

          <strong>
            <i class="fa-solid fa-bell"></i>
            ${getActivityReminderLabel(reminder)}
          </strong>
        </div>

        <div class="mobile-activity-detail">
          <span>Repetición</span>

          <strong>
            <i
              class="fa-solid ${getRepeatTypeIcon(
                reminder.repeat_type
              )}"
            ></i>

            ${formatRepeatType(reminder.repeat_type)}
          </strong>
        </div>
      </div>

      ${renderReminderActions(reminder)}
    </div>
  `;

  return card;
}


function setupMobileActivityCardExpansion() {
  if (!isDanyBotActivitiesMobileApp()) {
    return;
  }

  const sectionContent =
    document.getElementById('section-content');

  if (
    !sectionContent ||
    sectionContent.dataset.mobileActivityReady ===
      'true'
  ) {
    return;
  }

  sectionContent.dataset.mobileActivityReady = 'true';

  sectionContent.addEventListener('click', (event) => {
    const summaryButton = event.target.closest(
      '.mobile-activity-summary'
    );

    if (!summaryButton) {
      return;
    }

    const card = summaryButton.closest(
      '.mobile-activity-card'
    );

    const details = card?.querySelector(
      '.mobile-activity-details'
    );

    const chevron = card?.querySelector(
      '.mobile-activity-chevron'
    );

    if (!card || !details) {
      return;
    }

    const isExpanded =
      summaryButton.getAttribute('aria-expanded') ===
      'true';

    summaryButton.setAttribute(
      'aria-expanded',
      String(!isExpanded)
    );

    details.hidden = isExpanded;

    card.classList.toggle(
      'is-expanded',
      !isExpanded
    );

    if (chevron) {
      chevron.classList.toggle(
        'fa-chevron-down',
        isExpanded
      );

      chevron.classList.toggle(
        'fa-chevron-up',
        !isExpanded
      );
    }
  });
}


window.addEventListener(
  'hashchange',
  updateDanyBotActivitiesMobileView
);

document.addEventListener('DOMContentLoaded', () => {
  updateDanyBotActivitiesMobileView();
  setupMobileActivityCardExpansion();
});

updateDanyBotActivitiesMobileView();
setupMobileActivityCardExpansion();

function setupMobileActivityFormControls() {
  if (!isDanyBotActivitiesMobileApp()) {
    return;
  }

  const sectionContent =
    document.getElementById('section-content');

  const formPanel =
    sectionContent?.querySelector(
      '.manual-reminder-panel'
    );

  const formHeader =
    formPanel?.querySelector(
      '.manual-reminder-header'
    );

  const voicePanel =
    sectionContent?.querySelector(
      '.voice-reminder-panel'
    );

  const detectedReminderBox =
    sectionContent?.querySelector(
      '#detectedReminderBox'
    );

  if (!sectionContent || !formPanel || !formHeader) {
    return;
  }

  formPanel.classList.add(
    'mobile-activity-form-modal'
  );

  formPanel.setAttribute('aria-hidden', 'true');

  if (voicePanel) {
    voicePanel.classList.add(
      'mobile-activity-voice-panel'
    );

    formHeader.insertAdjacentElement(
      'afterend',
      voicePanel
    );
  }

  if (detectedReminderBox && voicePanel) {
    voicePanel.insertAdjacentElement(
      'afterend',
      detectedReminderBox
    );
  }

  let backdrop = document.getElementById(
    'mobileActivityFormBackdrop'
  );

  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'mobileActivityFormBackdrop';
    backdrop.className =
      'mobile-activity-form-backdrop';

    document.body.appendChild(backdrop);
  }

  let floatingButton = document.getElementById(
    'openMobileActivityFormButton'
  );

  if (!floatingButton) {
    floatingButton = document.createElement('button');

    floatingButton.type = 'button';
    floatingButton.id =
      'openMobileActivityFormButton';

    floatingButton.className =
      'mobile-activity-floating-button';

    floatingButton.setAttribute(
      'aria-label',
      'Agregar actividad'
    );

    floatingButton.innerHTML = `
      <i class="fa-solid fa-plus"></i>
    `;

    sectionContent.appendChild(floatingButton);
  }

  let closeButton = formHeader.querySelector(
    '.mobile-activity-form-close'
  );

  if (!closeButton) {
    closeButton = document.createElement('button');

    closeButton.type = 'button';
    closeButton.className =
      'mobile-activity-form-close';

    closeButton.setAttribute(
      'aria-label',
      'Cerrar formulario'
    );

    closeButton.innerHTML = `
      <i class="fa-solid fa-xmark"></i>
    `;

    formHeader.appendChild(closeButton);
  }

  const openForm = () => {

  const timeInput = document.getElementById(
      'manualReminderTime'
    );

    if (timeInput && !timeInput.value) {
      timeInput.value = '07:00';
    }

    formPanel.classList.add('is-open');
    backdrop.classList.add('is-visible');

    formPanel.setAttribute('aria-hidden', 'false');

    document.body.classList.add(
      'mobile-activity-form-open'
    );

    window.setTimeout(() => {
      document
        .getElementById('manualReminderTitle')
        ?.focus();
    }, 100);
  };

  const closeForm = () => {
    formPanel.classList.remove('is-open');
    backdrop.classList.remove('is-visible');

    formPanel.setAttribute('aria-hidden', 'true');

    document.body.classList.remove(
      'mobile-activity-form-open'
    );
  };

  floatingButton.onclick = openForm;
  closeButton.onclick = closeForm;
  backdrop.onclick = closeForm;

  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      formPanel.classList.contains('is-open')
    ) {
      closeForm();
    }
  });

  window.closeMobileActivityForm = closeForm;
}

function setupMobileActivitiesNotificationButton() {
  if (!isDanyBotActivitiesMobileApp()) {
    return;
  }

  const mainHeader =
    document.querySelector(".main-header");

  if (!mainHeader) {
    return;
  }

  let notificationButton =
    document.getElementById(
      "mobileActivitiesNotificationButton"
    );

  if (!notificationButton) {
    notificationButton =
      document.createElement("button");

    notificationButton.type = "button";
    notificationButton.id =
      "mobileActivitiesNotificationButton";

    notificationButton.className =
      "mobile-activities-notification-button";

    notificationButton.setAttribute(
      "aria-label",
      "Activar alertas"
    );

    notificationButton.innerHTML = `
      <i class="fa-solid fa-bell"></i>
    `;

    mainHeader.appendChild(notificationButton);
  }

  notificationButton.onclick = async () => {
    if (
      typeof enableReminderAlerts !==
      "function"
    ) {
      console.error(
        "No se encontró enableReminderAlerts()."
      );
      return;
    }

    await enableReminderAlerts();
  };

  const isActivitiesView =
    window.location.hash ===
    "#recordatorios";

  notificationButton.hidden =
    !isActivitiesView;
}

window.addEventListener(
  "hashchange",
  setupMobileActivitiesNotificationButton
);

document.addEventListener(
  "DOMContentLoaded",
  setupMobileActivitiesNotificationButton
);

setupMobileActivitiesNotificationButton();

function removeMobileActivitiesWebHeader() {
  if (!isDanyBotActivitiesMobileApp()) {
    return;
  }

  if (window.location.hash !== '#recordatorios') {
    return;
  }

  const webHeader = document.querySelector(
    '#section-content .voice-reminders-header'
  );

  if (webHeader) {
    webHeader.remove();
  }
}

function observeMobileActivitiesContent() {
  if (!isDanyBotActivitiesMobileApp()) {
    return;
  }

  const sectionContent = document.getElementById(
    'section-content'
  );

  if (
    !sectionContent ||
    sectionContent.dataset.activitiesHeaderObserver === 'true'
  ) {
    return;
  }

  sectionContent.dataset.activitiesHeaderObserver = 'true';

  const observer = new MutationObserver(() => {
    removeMobileActivitiesWebHeader();
  });

  observer.observe(sectionContent, {
    childList: true,
    subtree: true
  });

  removeMobileActivitiesWebHeader();
}

document.addEventListener(
  'DOMContentLoaded',
  observeMobileActivitiesContent
);

window.addEventListener(
  'hashchange',
  () => {
    observeMobileActivitiesContent();
    removeMobileActivitiesWebHeader();
  }
);

observeMobileActivitiesContent();
removeMobileActivitiesWebHeader();