/* ═══════════════════════════════════════════════════════
   Our Space – frontend app
   ═══════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────
let token        = localStorage.getItem('ourspace_token') || null;
let currentUser  = JSON.parse(localStorage.getItem('ourspace_user') || 'null');
let tasks        = [];
let events       = [];
let taskFilter   = 'all';
let refreshTimer = null;

// ── DOM references ───────────────────────────────────────
const loginScreen    = document.getElementById('login-screen');
const appScreen      = document.getElementById('app-screen');
const loginForm      = document.getElementById('login-form');
const loginError     = document.getElementById('login-error');
const loginBtn       = document.getElementById('login-btn');
const togglePwd      = document.getElementById('toggle-pwd');
const loginPwdInput  = document.getElementById('login-password');
const eyeIcon        = document.getElementById('eye-icon');

const logoutBtn      = document.getElementById('logout-btn');
const userDisplayName= document.getElementById('user-display-name');
const userAvatar     = document.getElementById('user-avatar');
const todayDisplay   = document.getElementById('today-display');

const tabBtns        = document.querySelectorAll('.tab-btn');
const tabPanels      = document.querySelectorAll('.tab-panel');

// Tasks
const addTaskToggle  = document.getElementById('add-task-toggle');
const addTaskBody    = document.getElementById('add-task-body');
const taskArrow      = document.getElementById('task-arrow');
const addTaskCard    = document.getElementById('add-task-card');
const addTaskForm    = document.getElementById('add-task-form');
const taskTitleInput = document.getElementById('task-title');
const taskDescInput  = document.getElementById('task-desc');
const taskDueInput   = document.getElementById('task-due');
const taskPriorityInput  = document.getElementById('task-priority');
const taskAssignedInput  = document.getElementById('task-assigned');
const taskFormError  = document.getElementById('task-form-error');
const taskList       = document.getElementById('task-list');
const tasksEmpty     = document.getElementById('tasks-empty');
const taskFilters    = document.getElementById('task-filters');

// Events
const addEventToggle  = document.getElementById('add-event-toggle');
const addEventBody    = document.getElementById('add-event-body');
const eventArrow      = document.getElementById('event-arrow');
const addEventCard    = document.getElementById('add-event-card');
const addEventForm    = document.getElementById('add-event-form');
const eventTitleInput = document.getElementById('event-title');
const eventDateInput  = document.getElementById('event-date');
const eventTimeInput  = document.getElementById('event-time');
const eventAlldayInput= document.getElementById('event-allday');
const eventDescInput  = document.getElementById('event-desc');
const eventFormError  = document.getElementById('event-form-error');
const eventList       = document.getElementById('event-list');
const eventsEmpty     = document.getElementById('events-empty');

const toastContainer  = document.getElementById('toast-container');

// ── Helpers ──────────────────────────────────────────────
function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(path, { ...opts, headers }).then(async (res) => {
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  });
}

function showToast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', info: '◈' };
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || '◈'}</span><span>${msg}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, min] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isToday(dateStr) { return dateStr === todayISO(); }

function formatDayHeading(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  date.setHours(0,0,0,0);
  if (date.getTime() === today.getTime()) return { label: 'Today', isToday: true };
  if (date.getTime() === tomorrow.getTime()) return { label: 'Tomorrow', isToday: false };
  return { label: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), isToday: false };
}

function setTodayDisplay() {
  const d = new Date();
  todayDisplay.textContent = d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Auth ─────────────────────────────────────────────────
function showLogin() {
  loginScreen.classList.add('active');
  appScreen.classList.remove('active');
  clearInterval(refreshTimer);
}

function showApp() {
  loginScreen.classList.remove('active');
  appScreen.classList.add('active');
  setTodayDisplay();
  userDisplayName.textContent = currentUser.displayName;
  userAvatar.textContent = currentUser.displayName.charAt(0).toUpperCase();
  loadAll();
  clearInterval(refreshTimer);
  refreshTimer = setInterval(loadAll, 30000);
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('ourspace_token');
  localStorage.removeItem('ourspace_user');
  tasks = [];
  events = [];
  showLogin();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';
  try {
    const data = await apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('login-username').value.trim(),
        password: loginPwdInput.value,
      }),
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('ourspace_token', token);
    localStorage.setItem('ourspace_user', JSON.stringify(currentUser));
    loginForm.reset();
    showApp();
  } catch (err) {
    loginError.textContent = err.message || 'Login failed';
    loginError.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign in';
  }
});

togglePwd.addEventListener('click', () => {
  if (loginPwdInput.type === 'password') {
    loginPwdInput.type = 'text';
    eyeIcon.textContent = '🙈';
  } else {
    loginPwdInput.type = 'password';
    eyeIcon.textContent = '👁';
  }
});

logoutBtn.addEventListener('click', logout);

// ── Tabs ─────────────────────────────────────────────────
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabBtns.forEach((b) => b.classList.remove('active'));
    tabPanels.forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ── Collapsible add-forms ─────────────────────────────────
function setupCollapse(toggleEl, bodyEl, arrowEl, cardEl) {
  let open = true;
  toggleEl.addEventListener('click', () => {
    open = !open;
    bodyEl.classList.toggle('hidden', !open);
    cardEl.classList.toggle('collapsed', !open);
    arrowEl.style.transform = open ? 'rotate(0deg)' : 'rotate(-90deg)';
  });
}
setupCollapse(addTaskToggle, addTaskBody, taskArrow, addTaskCard);
setupCollapse(addEventToggle, addEventBody, eventArrow, addEventCard);

// ── All-day toggle ────────────────────────────────────────
eventAlldayInput.addEventListener('change', () => {
  eventTimeInput.disabled = eventAlldayInput.checked;
  if (eventAlldayInput.checked) eventTimeInput.value = '';
  eventTimeInput.style.opacity = eventAlldayInput.checked ? '.4' : '1';
});

// ── Load data ─────────────────────────────────────────────
async function loadAll() {
  try {
    const [t, ev] = await Promise.all([
      apiFetch('/api/tasks'),
      apiFetch('/api/events'),
    ]);
    tasks  = t;
    events = ev;
    renderTasks();
    renderEvents();
  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Invalid')) {
      logout();
    }
  }
}

// ── Partner name helper ───────────────────────────────────
function partnerName() {
  if (!currentUser) return 'Partner';
  // find the other user's display name from task/event data
  const allNames = [...tasks, ...events]
    .map((i) => i.createdByName)
    .filter((n) => n && n !== currentUser.displayName);
  return allNames.length ? allNames[0] : 'Partner';
}

// ── TASKS ─────────────────────────────────────────────────
function assignedLabel(task) {
  if (task.assignedTo === 'me') {
    // "me" means the user who created it
    return task.createdBy === currentUser.id ? 'You' : task.createdByName;
  }
  if (task.assignedTo === 'partner') {
    return task.createdBy === currentUser.id ? partnerName() : 'You';
  }
  return 'Both';
}

function filterTasks(list) {
  if (taskFilter === 'all') return list;
  if (taskFilter === 'mine') {
    return list.filter((t) => {
      if (t.assignedTo === 'both') return true;
      if (t.assignedTo === 'me')      return t.createdBy === currentUser.id;
      if (t.assignedTo === 'partner') return t.createdBy !== currentUser.id;
      return false;
    });
  }
  if (taskFilter === 'partner') {
    return list.filter((t) => {
      if (t.assignedTo === 'both') return true;
      if (t.assignedTo === 'partner') return t.createdBy === currentUser.id;
      if (t.assignedTo === 'me')      return t.createdBy !== currentUser.id;
      return false;
    });
  }
  if (taskFilter === 'completed') return list.filter((t) => t.completed);
  if (taskFilter === 'pending')   return list.filter((t) => !t.completed);
  return list;
}

function renderTasks() {
  const filtered = filterTasks(tasks);
  // clear dynamic items (keep empty state)
  Array.from(taskList.querySelectorAll('.task-item')).forEach((el) => el.remove());

  if (filtered.length === 0) {
    tasksEmpty.style.display = '';
    return;
  }
  tasksEmpty.style.display = 'none';

  filtered.forEach((task) => {
    const el = document.createElement('div');
    el.className = 'task-item' + (task.completed ? ' completed' : '');
    el.dataset.id = task.id;

    const dueHtml = task.dueDate
      ? `<span class="meta-chip"><span class="chip-icon">📅</span>${formatDate(task.dueDate)}</span>`
      : '';
    const descHtml = task.description
      ? `<p class="task-desc">${escHtml(task.description)}</p>`
      : '';
    const assignLabel = assignedLabel(task);

    el.innerHTML = `
      <button class="task-check-btn" title="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
        ${task.completed ? '✓' : ''}
      </button>
      <div class="task-body">
        <div class="task-title-row">
          <span class="task-title">${escHtml(task.title)}</span>
          <span class="priority-badge priority-${task.priority}">${task.priority}</span>
        </div>
        ${descHtml}
        <div class="task-meta">
          ${dueHtml}
          <span class="assign-chip">→ ${escHtml(assignLabel)}</span>
          <span class="meta-chip">Added by ${escHtml(task.createdByName)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-danger delete-task-btn" title="Delete task">✕</button>
      </div>
    `;

    el.querySelector('.task-check-btn').addEventListener('click', () => toggleTask(task.id, !task.completed));
    el.querySelector('.delete-task-btn').addEventListener('click', () => deleteTask(task.id));
    taskList.appendChild(el);
  });
}

taskFilters.addEventListener('click', (e) => {
  const pill = e.target.closest('.filter-pill');
  if (!pill) return;
  taskFilter = pill.dataset.filter;
  taskFilters.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
  pill.classList.add('active');
  renderTasks();
});

addTaskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  taskFormError.classList.add('hidden');
  const title = taskTitleInput.value.trim();
  if (!title) {
    taskFormError.textContent = 'Title is required.';
    taskFormError.classList.remove('hidden');
    return;
  }
  const btn = addTaskForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const task = await apiFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: taskDescInput.value.trim(),
        dueDate: taskDueInput.value || null,
        priority: taskPriorityInput.value,
        assignedTo: taskAssignedInput.value,
      }),
    });
    tasks.unshift(task);
    renderTasks();
    addTaskForm.reset();
    taskPriorityInput.value = 'medium';
    taskAssignedInput.value = 'both';
    showToast('Task added!', 'success');
  } catch (err) {
    taskFormError.textContent = err.message;
    taskFormError.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
});

async function toggleTask(id, completed) {
  try {
    const updated = await apiFetch(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed }),
    });
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx !== -1) tasks[idx] = updated;
    renderTasks();
    showToast(completed ? 'Marked as done ✓' : 'Marked as pending', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    tasks = tasks.filter((t) => t.id !== id);
    renderTasks();
    showToast('Task deleted', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── EVENTS ────────────────────────────────────────────────
function renderEvents() {
  Array.from(eventList.querySelectorAll('.day-group')).forEach((el) => el.remove());

  if (events.length === 0) {
    eventsEmpty.style.display = '';
    return;
  }
  eventsEmpty.style.display = 'none';

  // Group by date
  const groups = {};
  events.forEach((ev) => {
    if (!groups[ev.date]) groups[ev.date] = [];
    groups[ev.date].push(ev);
  });

  Object.keys(groups).sort().forEach((dateStr) => {
    const { label, isToday: dayIsToday } = formatDayHeading(dateStr);
    const group = document.createElement('div');
    group.className = 'day-group';

    const todayBadge = dayIsToday ? `<span class="day-today-label">Today</span>` : '';
    group.innerHTML = `<div class="day-heading">${escHtml(label)} ${todayBadge}</div>`;

    groups[dateStr].forEach((ev) => {
      const el = document.createElement('div');
      el.className = 'event-item';
      el.dataset.id = ev.id;

      const timeHtml = ev.allDay
        ? `<span class="event-allday">All day</span>`
        : `<span class="event-time">${ev.time ? formatTime(ev.time) : '—'}</span>`;
      const descHtml = ev.description
        ? `<p class="event-desc">${escHtml(ev.description)}</p>`
        : '';

      el.innerHTML = `
        <div class="event-time-col">${timeHtml}</div>
        <div class="event-body">
          <div class="event-title">${escHtml(ev.title)}</div>
          ${descHtml}
          <div class="event-creator">Added by ${escHtml(ev.createdByName)}</div>
        </div>
        <div class="event-actions">
          <button class="btn btn-danger delete-event-btn" title="Delete event">✕</button>
        </div>
      `;

      el.querySelector('.delete-event-btn').addEventListener('click', () => deleteEvent(ev.id));
      group.appendChild(el);
    });

    eventList.appendChild(group);
  });
}

addEventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  eventFormError.classList.add('hidden');
  const title = eventTitleInput.value.trim();
  const date  = eventDateInput.value;
  if (!title) {
    eventFormError.textContent = 'Title is required.';
    eventFormError.classList.remove('hidden');
    return;
  }
  if (!date) {
    eventFormError.textContent = 'Date is required.';
    eventFormError.classList.remove('hidden');
    return;
  }
  const btn = addEventForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const ev = await apiFetch('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        title,
        date,
        time: eventAlldayInput.checked ? null : (eventTimeInput.value || null),
        description: eventDescInput.value.trim(),
        allDay: eventAlldayInput.checked,
      }),
    });
    // Insert and re-sort locally
    events.push(ev);
    events.sort((a, b) => {
      const da = a.date + (a.time ? 'T' + a.time : 'T00:00');
      const db = b.date + (b.time ? 'T' + b.time : 'T00:00');
      return da.localeCompare(db);
    });
    renderEvents();
    addEventForm.reset();
    eventTimeInput.disabled = false;
    eventTimeInput.style.opacity = '1';
    showToast('Event added!', 'success');
  } catch (err) {
    eventFormError.textContent = err.message;
    eventFormError.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
});

async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  try {
    await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
    events = events.filter((ev) => ev.id !== id);
    renderEvents();
    showToast('Event deleted', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Boot ──────────────────────────────────────────────────
if (token && currentUser) {
  showApp();
} else {
  showLogin();
}
