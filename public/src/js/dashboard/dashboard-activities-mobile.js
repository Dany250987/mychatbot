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

  card.className = [
    'mobile-activity-card',
    categoryClass,
    `mobile-activity-status-${statusClass}`
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