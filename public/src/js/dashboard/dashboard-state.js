let tasks = [];
let currentUserId = null;
let editingTaskId = null;

let currentTaskFilter = "pendiente";
let currentReminderFilter = "activos";

let reminders = [];
let lastDetectedReminder = null;

let currentCalendarDate = new Date();
let selectedCalendarDate = null;

let reminderAlertInterval = null;
let reminderAlertOpen = false;
let alertedReminderKeys = new Set();

let reminderAudioContext = null;
let browserNotificationsEnabled = false;

const TASKS_API_URL = "/api/tasks";
const REMINDERS_API_URL = "/api/reminders";
const EXPENSES_API_URL = "/api/expenses";
const INCOMES_API_URL = "/api/incomes";