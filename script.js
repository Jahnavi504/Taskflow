
const $ = (selector) => document.querySelector(selector);

const STORAGE = {
  users: "taskflow_users",
  user: "taskflow_current_user",
  tasks: "taskflow_tasks",
  settings: "taskflow_settings"
};

const baseSettings = {
  notifications: {
    reminders: true,
    overdue: true,
    upcoming: true,
    email: false,
    reminderTime: "1 day before",
    upcomingTime: "3 days"
  },
  dashboard: {
    total: true,
    completed: true,
    overdue: true,
    upcoming: false
  },
  appearance: "light",
  taskprefs: {
    priority: "Medium",
    sort: "due",
    showCompleted: true,
    weekStart: "Monday"
  },
  lastPasswordUpdated: ""
};

const categories = [
  ["account", "♙", "Account", "View your username and manage your password.", "blue"],
  ["notifications", "♧", "Notifications", "Manage your notifications.", "orange"],
  ["dashboard", "▦", "Dashboard Preferences", "Customize what appears on your dashboard.", "pink"],
  ["appearance", "◉", "Appearance", "Choose light or dark mode.", "green"],
  ["taskprefs", "☷", "Task Preferences", "Set your default task settings.", "purple"],
  ["privacy", "⬡", "Privacy & Data", "Manage your data and account.", "blue"]
];

let state = {
  view: "login",
  section: null,
  modal: null,
  search: "",
  priorityFilter: "all",
  deleteId: null,
  tasks: read(STORAGE.tasks, []),
  settings: loadSettings()
};

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadSettings() {
  const saved = read(STORAGE.settings, {});

  return {
    ...structuredClone(baseSettings),
    ...saved,
    notifications: {
      ...baseSettings.notifications,
      ...(saved.notifications || {})
    },
    dashboard: {
      ...baseSettings.dashboard,
      ...(saved.dashboard || {})
    },
    taskprefs: {
      ...baseSettings.taskprefs,
      ...(saved.taskprefs || {})
    }
  };
}

function currentUser() {
  return read(STORAGE.user, null);
}

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function toast(message, error = false) {
  const node = document.createElement("div");
  node.className = "toast" + (error ? " error" : "");
  node.textContent = message;

  $("#toast-container").appendChild(node);

  setTimeout(() => node.remove(), 3200);
}

function saveTasks() {
  write(STORAGE.tasks, state.tasks);
}

function saveSettings() {
  write(STORAGE.settings, state.settings);
}

function btn(label, action, extra = "") {
  return `<button class="btn ${extra}" data-action="${action}">${label}</button>`;
}

/* LOGIN AND REGISTRATION */

function authPage(register = false) {
  return `
    <main class="auth-page">
      <section class="auth-card">
        <div class="auth-brand">TaskFlow</div>

        <form id="auth-form" data-register="${register}">
          ${register ? `
            <div class="field">
              <label for="username">Username</label>
              <input
                id="username"
                name="username"
                required
                minlength="2"
                autocomplete="username"
                placeholder="Choose a username">
            </div>
          ` : ""}

          <div class="field">
            <label for="email">
              ${register ? "Email" : "Username or email"}
            </label>

            <input
              id="email"
              name="email"
              type="${register ? "email" : "text"}"
              required
              autocomplete="username"
              placeholder="${register ? "Enter your email" : "Username or email"}">
          </div>

          <div class="field">
            <label for="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minlength="6"
              autocomplete="${register ? "new-password" : "current-password"}"
              placeholder="Enter your password">
          </div>

          ${register ? `
            <div class="field">
              <label for="confirm">Confirm password</label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                minlength="6"
                autocomplete="new-password"
                placeholder="Confirm your password">
            </div>
          ` : ""}

          <button class="btn" type="submit">
            ${register ? "Create Account" : "Login"}
          </button>
        </form>

        <div class="auth-footer">
          ${register
            ? `Already have an account?
               <button class="textlink" data-view="login">Back to Login</button>`
            : `New user?
               <button class="textlink" data-view="register">Create an account</button>`
          }
        </div>
      </section>
    </main>
  `;
}

/* SIDEBAR AND MAIN LAYOUT */

function sidebar() {
  const links = [
    ["dashboard", "⌂", "Dashboard"],
    ["tasks", "☑", "My Tasks"],
    ["today", "▣", "Today"],
    ["upcoming", "◷", "Upcoming"],
    ["completed", "✓", "Completed"]
  ];

  return `
    <aside class="sidebar">
      <div class="brand">
        <span class="brandmark">✓</span>
        TaskFlow
      </div>

      <nav class="nav">
        ${links.map(([view, icon, label]) => `
          <button
            class="navbtn ${state.view === view ? "active" : ""}"
            data-view="${view}">
            <span class="navicon">${icon}</span>
            ${label}
          </button>
        `).join("")}
      </nav>

      <div class="navbottom">
        <button
          class="navbtn ${state.view === "settings" ? "active" : ""}"
          data-view="settings">
          <span class="navicon">⚙</span>
          Settings
        </button>

        <button class="navbtn" data-action="logout">
          <span class="navicon">⇥</span>
          Logout
        </button>
      </div>
    </aside>
  `;
}

function shell(content) {
  const user = currentUser();

  return `
    <div class="layout">
      ${sidebar()}

      <main class="main">
        <header class="topbar">
          <button
            class="iconbtn"
            title="Notifications"
            aria-label="Open notifications"
            data-view="settings"
            data-section="notifications">♧</button>

          <button
            class="avatar"
            title="${esc(user?.username || "Profile")}">
            ${esc((user?.username || "U").charAt(0).toUpperCase())}
          </button>
        </header>

        ${content}
      </main>
    </div>
  `;
}

function heading(title, description, eyebrow = "YOUR WORKSPACE", action = "") {
  return `
    <div class="heading">
      <div>
        <p class="eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
      ${action}
    </div>
  `;
}

/* DASHBOARD */

function statCard(label, value, icon, color = "") {
  return `
    <div class="stat">
      <div class="stat-icon ${color}">${icon}</div>

      <div>
        <div class="stat-label">${label}</div>
        <div class="stat-num">${value}</div>
      </div>
    </div>
  `;
}

function dashboard() {
  const tasks = state.tasks;
  const today = new Date().toISOString().slice(0, 10);

  const total = tasks.length;
  const completed = tasks.filter(task => task.done).length;

  const overdue = tasks.filter(task =>
    !task.done && task.due && task.due < today
  ).length;

  const upcoming = tasks.filter(task =>
    !task.done && task.due && task.due >= today
  ).length;

  const stats = [
    ["total", "Total Tasks", total, "▤", ""],
    ["completed", "Completed Tasks", completed, "✓", "green"],
    ["overdue", "Overdue Tasks", overdue, "◷", "red"],
    ["upcoming", "Upcoming Tasks", upcoming, "▣", ""]
  ].filter(([key]) => state.settings.dashboard[key]);

  return `
    ${heading(
      "Good Morning!",
      "Here's a clear space to plan your day.",
      "YOUR DASHBOARD"
    )}

    ${stats.length ? `
      <div class="stats">
        ${stats.map(item =>
          statCard(item[1], item[2], item[3], item[4])
        ).join("")}
      </div>
    ` : ""}

    ${tasks.length === 0 ? `
      <section class="empty">
        <div class="empty-art">▤</div>
        <h2>Your tasks will appear here</h2>
        <p>
          Start by adding a task and keep your work organized
          in one place.
        </p>
      </section>
    ` : `
      <section class="tasklist">
        ${tasks.slice(0, 5).map(taskRow).join("")}
      </section>
    `}

    <button
      class="fab"
      data-action="add"
      aria-label="Add task">+</button>
  `;
}

/* TASK MANAGEMENT */

function taskRow(task) {
  return `
    <div class="taskrow ${task.done ? "done" : ""}">
      <input
        type="checkbox"
        aria-label="Mark ${esc(task.title)} completed"
        data-complete="${task.id}"
        ${task.done ? "checked" : ""}>

      <div class="tasktext">
        <strong>${esc(task.title)}</strong>
        <small>
          ${task.due ? "Due " + esc(task.due) : "No due date"}
          ${task.notes ? " · " + esc(task.notes) : ""}
        </small>
      </div>

      <span class="priority ${esc(task.priority)}">
        ${esc(task.priority)}
      </span>

      <button class="btn secondary small" data-edit="${task.id}">
        Edit
      </button>

      <button class="btn danger small" data-delete="${task.id}">
        Delete
      </button>
    </div>
  `;
}

function taskPage() {
  const today = new Date().toISOString().slice(0, 10);
  let tasks = [...state.tasks];

  if (state.view === "today") {
    tasks = tasks.filter(task =>
      task.due === today && !task.done
    );
  } else if (state.view === "upcoming") {
    tasks = tasks.filter(task =>
      task.due && task.due > today && !task.done
    );
  } else if (state.view === "completed") {
    tasks = tasks.filter(task => task.done);
  } else if (!state.settings.taskprefs.showCompleted) {
    tasks = tasks.filter(task => !task.done);
  }

  if (state.search) {
    tasks = tasks.filter(task =>
      (task.title + " " + (task.notes || ""))
        .toLowerCase()
        .includes(state.search.toLowerCase())
    );
  }

  if (state.view === "tasks" && state.priorityFilter !== "all") {
    tasks = tasks.filter(task =>
      task.priority === state.priorityFilter
    );
  }

  const sort = state.settings.taskprefs.sort;

  tasks.sort((a, b) => {
    if (sort === "priority") {
      const priorities = ["High", "Medium", "Low"];

      return priorities.indexOf(a.priority) -
        priorities.indexOf(b.priority);
    }

    if (sort === "created") {
      return b.created - a.created;
    }

    if (sort === "alphabetical") {
      return a.title.localeCompare(b.title);
    }

    return (a.due || "9999").localeCompare(b.due || "9999");
  });

  const titles = {
    tasks: "My Tasks",
    today: "Today",
    upcoming: "Upcoming",
    completed: "Completed"
  };

  return `
    ${heading(
      titles[state.view],
      "Keep your next steps clear and manageable.",
      "YOUR WORKSPACE"
    )}

    <div class="filterbar">
      <input
        class="input"
        id="search"
        placeholder="Search tasks..."
        value="${esc(state.search)}">

      ${state.view === "tasks" ? `
        <select class="select" id="priority-filter">
          <option value="all">All priorities</option>
          ${["High", "Medium", "Low"].map(priority => `
            <option
              value="${priority}"
              ${state.priorityFilter === priority ? "selected" : ""}>
              ${priority}
            </option>
          `).join("")}
        </select>
      ` : ""}
    </div>

    ${tasks.length
      ? `<div class="tasklist">${tasks.map(taskRow).join("")}</div>`
      : `
        <div class="empty-small">
          <strong>No tasks here yet</strong>
          Add a task to start organizing your work.
        </div>
      `
    }

    <!-- The only Add Task button on this page -->
    <button
      class="fab"
      data-action="add"
      aria-label="Add task">+</button>
  `;
}

/* SETTINGS OVERVIEW */

function settingsOverview() {
  return `
    <div class="settings-layout">
      <section class="settings-menu">
        <div class="settings-title">
          <h1>Settings</h1>
          <p>Manage your account and preferences.</p>
        </div>

        <div class="categories">
          ${categories.map(([id, icon, title, description, color]) => `
            <button class="catbtn" data-section="${id}">
              <span class="caticon ${color}">${icon}</span>

              <span class="catcopy">
                <strong>${title}</strong>
                <small>${description}</small>
              </span>

              <span class="chev">›</span>
            </button>
          `).join("")}
        </div>
      </section>

      <section class="detail">
        <div class="detailhead">
          <span class="caticon">⚙</span>
          <div>
            <h2>Settings</h2>
            <p>Choose a category to manage your TaskFlow preferences.</p>
          </div>
        </div>

        <div class="empty-small">
          <strong>Everything in its place</strong>
          Select one of the settings categories to get started.
        </div>
      </section>
    </div>
  `;
}

function detailHeader(id) {
  const category = categories.find(item => item[0] === id);

  return `
    <button class="back" data-action="back">
      ← Back to Settings
    </button>

    <div class="detailhead">
      <span class="caticon ${category[4]}">${category[1]}</span>

      <div>
        <h2>${category[2]}</h2>
        <p>${category[3]}</p>
      </div>
    </div>
  `;
}

/* NOTIFICATIONS */

function toggleOption(path, title, description, icon, extra = "") {
  const value = path.split(".").reduce(
    (object, key) => object?.[key],
    state.settings
  );

  return `
    <div class="option">
      <span class="opticon">${icon}</span>

      <div class="optcopy">
        <strong>${title}</strong>
        <p>${description}</p>
      </div>

      <button
        class="switch"
        role="switch"
        aria-checked="${Boolean(value)}"
        aria-label="${title}"
        data-toggle="${path}"></button>

      ${extra}
    </div>
  `;
}

function notificationSettings() {
  return `
    ${detailHeader("notifications")}

    ${toggleOption(
      "notifications.reminders",
      "Task Reminders",
      "Get notified before a task is due.",
      "▣",
      `
        <div class="subsetting">
          <label class="label" for="reminder-time">Reminder time</label>

          <select
            class="select"
            id="reminder-time"
            data-setting="notifications.reminderTime">
            ${["On due date", "1 day before", "2 days before", "1 week before"]
              .map(value => `
                <option
                  ${state.settings.notifications.reminderTime === value ? "selected" : ""}>
                  ${value}
                </option>
              `).join("")}
          </select>
        </div>
      `
    )}

    ${toggleOption(
      "notifications.overdue",
      "Overdue Task Alerts",
      "Get notified when a task passes its due date.",
      "◷"
    )}

    ${toggleOption(
      "notifications.upcoming",
      "Upcoming Tasks",
      "Get reminders about tasks due in the next few days.",
      "▣",
      `
        <div class="subsetting">
          <label class="label" for="upcoming-time">
            Notify me for tasks due in
          </label>

          <select
            class="select"
            id="upcoming-time"
            data-setting="notifications.upcomingTime">
            ${["1 day", "3 days", "7 days"].map(value => `
              <option
                ${state.settings.notifications.upcomingTime === value ? "selected" : ""}>
                ${value}
              </option>
            `).join("")}
          </select>
        </div>
      `
    )}

    ${toggleOption(
      "notifications.email",
      "Email Notifications (Optional)",
      "Email alerts require a connected email service.",
      "✉"
    )}

    <div class="save-row">
      ${btn("Save Changes", "save-settings")}
    </div>
  `;
}

/* ACCOUNT SETTINGS */

function accountSettings() {
  const user = currentUser();

  return `
    ${detailHeader("account")}

    <div class="profile-card">
      <div class="profile-avatar">
        ${esc((user?.username || "U")[0].toUpperCase())}
      </div>

      <div>
        <strong>${esc(user?.username || "User")}</strong>
        <p>Welcome to your TaskFlow workspace.</p>
      </div>
    </div>

    <h3 class="section-label">Password &amp; Security</h3>

    <form id="password-form" class="formgrid">
      <div class="field">
        <label for="old-password">Current Password</label>
        <input id="old-password" name="oldpass" type="password" required>
      </div>

      <div class="field">
        <label for="new-password">New Password</label>
        <input id="new-password" name="newpass" type="password" minlength="6" required>

        <div class="strength">
          <span id="strength-fill"></span>
        </div>

        <p class="hint" id="strength-text">
          Password strength will appear here.
        </p>
      </div>

      <div class="field">
        <label for="confirm-password">Confirm New Password</label>
        <input id="confirm-password" name="confirmpass" type="password" minlength="6" required>
      </div>

      <p class="hint">
        ${state.settings.lastPasswordUpdated
          ? "Last password update: " + esc(state.settings.lastPasswordUpdated)
          : "Password update date will appear after you change your password."
        }
      </p>

      <div class="save-row">
        <button class="btn" type="submit">Change Password</button>
      </div>
    </form>
  `;
}

/* DASHBOARD PREFERENCES */

function dashboardPreferences() {
  const options = [
    ["total", "Total Tasks", "Show the total number of tasks."],
    ["completed", "Completed Tasks", "Show the number of completed tasks."],
    ["overdue", "Overdue Tasks", "Show tasks past their due date."],
    ["upcoming", "Upcoming Tasks", "Show tasks with future due dates."]
  ];

  return `
    ${detailHeader("dashboard")}

    <div class="checklist">
      ${options.map(([id, label, description]) => `
        <label class="checkrow">
          <input
            type="checkbox"
            data-setting="dashboard.${id}"
            ${state.settings.dashboard[id] ? "checked" : ""}>

          <span>
            <strong>${label}</strong>
            <small>${description}</small>
          </span>
        </label>
      `).join("")}
    </div>

    <div class="save-row">
      ${btn("Save Changes", "save-settings")}
    </div>
  `;
}

/* APPEARANCE */

function appearanceSettings() {
  return `
    ${detailHeader("appearance")}

    <div class="themes">
      ${["light", "dark"].map(theme => `
        <button
          class="theme ${state.settings.appearance === theme ? "selected" : ""}"
          data-theme="${theme}">

          <div class="preview ${theme}">
            <span></span>
            <span></span>
          </div>

          <strong>
            ${theme === "light" ? "☀ Light Mode" : "☾ Dark Mode"}
          </strong>
        </button>
      `).join("")}
    </div>

    <p class="hint" style="margin-top:16px">
      Choose the appearance that's comfortable for you.
    </p>
  `;
}

/* TASK PREFERENCES */

function taskPreferenceSettings() {
  return `
    ${detailHeader("taskprefs")}

    <div class="formgrid">
      <div class="field">
        <label for="default-priority">Default Task Priority</label>

        <select class="select" id="default-priority" data-setting="taskprefs.priority">
          ${["Low", "Medium", "High"].map(value => `
            <option
              ${state.settings.taskprefs.priority === value ? "selected" : ""}>
              ${value}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="field">
        <label for="default-sort">Default Sort Order</label>

        <select class="select" id="default-sort" data-setting="taskprefs.sort">
          ${[
            ["due", "Due date"],
            ["priority", "Priority"],
            ["created", "Date created"],
            ["alphabetical", "Alphabetical"]
          ].map(([value, label]) => `
            <option
              value="${value}"
              ${state.settings.taskprefs.sort === value ? "selected" : ""}>
              ${label}
            </option>
          `).join("")}
        </select>
      </div>

      <label class="checkrow">
        <input
          type="checkbox"
          data-setting="taskprefs.showCompleted"
          ${state.settings.taskprefs.showCompleted ? "checked" : ""}>

        <span>
          <strong>Show completed tasks in My Tasks</strong>
          <small>Turn this off to hide completed tasks from your main list.</small>
        </span>
      </label>

      <div class="field">
        <label for="week-start">Start of the Week</label>

        <select class="select" id="week-start" data-setting="taskprefs.weekStart">
          ${["Monday", "Sunday"].map(value => `
            <option
              ${state.settings.taskprefs.weekStart === value ? "selected" : ""}>
              ${value}
            </option>
          `).join("")}
        </select>
      </div>
    </div>

    <div class="save-row">
      ${btn("Save Changes", "save-settings")}
    </div>
  `;
}

/* PRIVACY AND DATA */

function privacySettings() {
  return `
    ${detailHeader("privacy")}

    <div class="option">
      <span class="opticon">⇩</span>

      <div class="optcopy">
        <strong>Export Tasks</strong>
        <p>Download your tasks as a CSV spreadsheet.</p>
      </div>

      ${btn("Export CSV", "export", "secondary small")}
    </div>

    <div class="option">
      <span class="opticon">⇥</span>

      <div class="optcopy">
        <strong>Sign Out</strong>
        <p>Sign out of your current TaskFlow session.</p>
      </div>

      ${btn("Sign Out", "logout", "secondary small")}
    </div>

    <div class="option">
      <span class="opticon" style="background:#ffedf0;color:#e34b64">!</span>

      <div class="optcopy">
        <strong>Delete Account</strong>
        <p>Remove your local demo account and task data from this browser.</p>
      </div>

      ${btn("Delete Account", "delete-account", "danger small")}
    </div>
  `;
}

function settingsDetail() {
  const pages = {
    account: accountSettings,
    notifications: notificationSettings,
    dashboard: dashboardPreferences,
    appearance: appearanceSettings,
    taskprefs: taskPreferenceSettings,
    privacy: privacySettings
  };

  return `
    <div class="settings-layout detail-only">
      <section class="detail">
        ${pages[state.section]()}
      </section>
    </div>
  `;
}

/* ADD AND EDIT TASK MODAL */

function taskModal() {
  if (!state.modal) return "";

  if (state.modal.type === "task") {
    const task = state.modal.task || {
      title: "",
      notes: "",
      due: "",
      priority: state.settings.taskprefs.priority
    };

    return `
      <div class="modalbg" data-close-background>
        <section class="modal" role="dialog" aria-modal="true">
          <h2>${task.id ? "Edit Task" : "Add a New Task"}</h2>
          <p>Keep your next step clear and achievable.</p>

          <form id="task-form" data-id="${task.id || ""}">
            <div class="formgrid">
              <div class="field">
                <label for="task-title">Task Name</label>
                <input
                  id="task-title"
                  name="title"
                  required
                  maxlength="120"
                  value="${esc(task.title)}"
                  placeholder="e.g. Finish project report">
              </div>

              <div class="field">
                <label for="task-notes">Notes (optional)</label>
                <input
                  id="task-notes"
                  name="notes"
                  maxlength="240"
                  value="${esc(task.notes || "")}"
                  placeholder="Add a short note">
              </div>

              <div class="field">
                <label for="task-due">Due Date (optional)</label>
                <input
                  id="task-due"
                  name="due"
                  type="date"
                  value="${esc(task.due || "")}">
              </div>

              <div class="field">
                <label for="task-priority">Priority</label>
                <select class="select" id="task-priority" name="priority">
                  ${["Low", "Medium", "High"].map(value => `
                    <option ${task.priority === value ? "selected" : ""}>
                      ${value}
                    </option>
                  `).join("")}
                </select>
              </div>
            </div>

            <div class="modalactions">
              <button class="btn ghost" type="button" data-action="close">
                Cancel
              </button>

              <button class="btn" type="submit">
                ${task.id ? "Save Changes" : "Add Task"}
              </button>
            </div>
          </form>
        </section>
      </div>
    `;
  }

  const isAccount = state.modal.type === "delete-account";

  return `
    <div class="modalbg">
      <section class="modal" role="dialog" aria-modal="true">
        <h2>${isAccount ? "Delete this account?" : "Delete this task?"}</h2>

        <p>
          ${isAccount
            ? "This permanently removes your local demo account and tasks from this browser. This cannot be undone."
            : "This task will be removed from your list."
          }
        </p>

        <div class="modalactions">
          <button class="btn ghost" data-action="close">Cancel</button>

          <button class="btn danger" data-action="confirm-delete">
            ${isAccount ? "Delete Account" : "Delete Task"}
          </button>
        </div>
      </section>
    </div>
  `;
}

/* RENDER */

function render() {
  document.body.classList.toggle(
    "dark",
    state.settings.appearance === "dark" && !!currentUser()
  );

  if (!currentUser()) {
    if (!["login", "register"].includes(state.view)) {
      state.view = "login";
    }

    $("#app").innerHTML = authPage(state.view === "register");
    return;
  }

  let content;

  if (state.view === "settings") {
    content = state.section
      ? settingsDetail()
      : settingsOverview();
  } else if (
    ["tasks", "today", "upcoming", "completed"].includes(state.view)
  ) {
    content = taskPage();
  } else {
    content = dashboard();
  }

  $("#app").innerHTML = shell(content) + taskModal();
}

/* NAVIGATION */

function navigate(view, section = null) {
  if (view === "logout") {
    logout();
    return;
  }

  state.view = view;
  state.section = section;
  state.search = "";
  state.priorityFilter = "all";
  state.modal = null;

  render();
}

function logout() {
  localStorage.removeItem(STORAGE.user);

  state.view = "login";
  state.section = null;
  state.modal = null;

  render();
  toast("You have been signed out.");
}

/* TASK ACTIONS */

function addTask(id = null) {
  const task = id
    ? state.tasks.find(item => item.id === id)
    : null;

  state.modal = {
    type: "task",
    task: task ? { ...task } : null
  };

  render();

  setTimeout(() => $("#task-title")?.focus(), 30);
}

function saveTask(form) {
  const data = new FormData(form);
  const title = String(data.get("title") || "").trim();

  if (!title) {
    return toast("Please enter a task name.", true);
  }

  const id = form.dataset.id;

  const values = {
    title,
    notes: String(data.get("notes") || "").trim(),
    due: String(data.get("due") || ""),
    priority: String(data.get("priority") || "Medium")
  };

  if (id) {
    state.tasks = state.tasks.map(task =>
      task.id === id ? { ...task, ...values } : task
    );

    toast("Task updated.");
  } else {
    state.tasks.push({
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),
      ...values,
      done: false,
      created: Date.now()
    });

    toast("Task added.");
  }

  saveTasks();
  state.modal = null;
  render();
}

/* AUTHENTICATION DEMO */

function submitAuth(form) {
  const data = new FormData(form);
  const register = form.dataset.register === "true";
  const email = String(data.get("email") || "").trim().toLowerCase();
  const password = String(data.get("password") || "");
  const users = read(STORAGE.users, []);

  if (register) {
    const username = String(data.get("username") || "").trim();

    if (password !== data.get("confirm")) {
      return toast("Passwords do not match.", true);
    }

    if (users.some(user =>
      user.username.toLowerCase() === username.toLowerCase() ||
      user.email === email
    )) {
      return toast(
        "That username or email is already registered in this browser.",
        true
      );
    }

    users.push({ username, email, password });
    write(STORAGE.users, users);

    write(STORAGE.user, { username, email });

    state.tasks = [];
    saveTasks();

    state.view = "dashboard";
    state.section = null;

    toast("Account created. Welcome to TaskFlow!");
    render();
    return;
  }

  const user = users.find(item =>
    (item.username.toLowerCase() === email || item.email === email) &&
    item.password === password
  );

  if (!user) {
    return toast(
      "Account not found. Check your details or create an account.",
      true
    );
  }

  write(STORAGE.user, {
    username: user.username,
    email: user.email
  });

  state.tasks = read(STORAGE.tasks, []);
  state.settings = loadSettings();
  state.view = "dashboard";
  state.section = null;

  toast(`Welcome back, ${user.username}!`);
  render();
}

function changePassword(form) {
  const user = currentUser();
  const data = new FormData(form);
  const users = read(STORAGE.users, []);

  const index = users.findIndex(item =>
    item.username === user.username
  );

  const nextPassword = String(data.get("newpass") || "");

  if (index < 0 || users[index].password !== data.get("oldpass")) {
    return toast("Current password is incorrect.", true);
  }

  if (nextPassword.length < 6) {
    return toast("Use at least 6 characters.", true);
  }

  if (nextPassword !== data.get("confirmpass")) {
    return toast("The new passwords do not match.", true);
  }

  users[index].password = nextPassword;
  write(STORAGE.users, users);

  state.settings.lastPasswordUpdated = new Date().toLocaleDateString();
  saveSettings();

  toast("Password changed in this browser demo.");
  render();
}

/* EXPORT TASKS */

function exportTasks() {
  const rows = [
    ["Title", "Notes", "Due Date", "Priority", "Completed"],
    ...state.tasks.map(task => [
      task.title,
      task.notes || "",
      task.due || "",
      task.priority,
      task.done ? "Yes" : "No"
    ])
  ];

  const csv = rows.map(row =>
    row.map(value =>
      '"' + String(value).replaceAll('"', '""') + '"'
    ).join(",")
  ).join("\r\n");

  const url = URL.createObjectURL(
    new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8"
    })
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = "taskflow-tasks.csv";
  link.click();

  URL.revokeObjectURL(url);
  toast("Your task export is ready.");
}

/* DELETE ACCOUNT */

function deleteAccount() {
  const user = currentUser();

  write(
    STORAGE.users,
    read(STORAGE.users, []).filter(item =>
      item.username !== user.username
    )
  );

  localStorage.removeItem(STORAGE.user);
  localStorage.removeItem(STORAGE.tasks);
  localStorage.removeItem(STORAGE.settings);

  state.tasks = [];
  state.settings = structuredClone(baseSettings);
  state.view = "login";
  state.section = null;
  state.modal = null;

  render();
  toast("Local demo account deleted.");
}

/* CLICK EVENTS */

document.addEventListener("click", event => {
  const viewButton = event.target.closest("[data-view]");

  if (viewButton) {
    navigate(
      viewButton.dataset.view,
      viewButton.dataset.section || null
    );
    return;
  }

  const sectionButton = event.target.closest("[data-section]");

  if (sectionButton) {
    state.view = "settings";
    state.section = sectionButton.dataset.section;
    state.modal = null;
    render();
    return;
  }

  const toggle = event.target.closest("[data-toggle]");

  if (toggle) {
    const path = toggle.dataset.toggle.split(".");
    let target = state.settings;

    for (const key of path.slice(0, -1)) {
      target = target[key];
    }

    const last = path[path.length - 1];
    target[last] = !target[last];

    saveSettings();
    render();
    return;
  }

  const theme = event.target.closest("[data-theme]");

  if (theme) {
    state.settings.appearance = theme.dataset.theme;
    saveSettings();
    render();
    return;
  }

  const complete = event.target.closest("[data-complete]");

  if (complete) {
    state.tasks = state.tasks.map(task =>
      task.id === complete.dataset.complete
        ? { ...task, done: complete.checked }
        : task
    );

    saveTasks();
    render();
    return;
  }

  const edit = event.target.closest("[data-edit]");

  if (edit) {
    addTask(edit.dataset.edit);
    return;
  }

  const del = event.target.closest("[data-delete]");

  if (del) {
    state.deleteId = del.dataset.delete;
    state.modal = { type: "delete-task" };
    render();
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;

  if (!action) return;

  switch (action) {
    case "add":
      addTask();
      break;

    case "back":
      state.section = null;
      render();
      break;

    case "close":
      state.modal = null;
      render();
      break;

    case "save-settings":
      saveSettings();
      toast("Settings saved.");
      render();
      break;

    case "export":
      exportTasks();
      break;

    case "logout":
      logout();
      break;

    case "delete-account":
      state.modal = { type: "delete-account" };
      render();
      break;

    case "confirm-delete":
      if (state.modal?.type === "delete-account") {
        deleteAccount();
      } else {
        state.tasks = state.tasks.filter(
          task => task.id !== state.deleteId
        );

        saveTasks();
        state.modal = null;

        render();
        toast("Task deleted.");
      }
      break;
  }
});

/* CHANGE EVENTS */

document.addEventListener("change", event => {
  const element = event.target;

  if (element.dataset.setting) {
    const keys = element.dataset.setting.split(".");
    let target = state.settings;

    for (const key of keys.slice(0, -1)) {
      target = target[key];
    }

    target[keys[keys.length - 1]] =
      element.type === "checkbox"
        ? element.checked
        : element.value;

    saveSettings();

    if (element.dataset.setting.startsWith("dashboard.")) {
      render();
    }
  }

  if (element.id === "priority-filter") {
    state.priorityFilter = element.value;
    render();
  }
});

/* LIVE SEARCH AND PASSWORD STRENGTH */

document.addEventListener("input", event => {
  const element = event.target;

  if (element.id === "search") {
    const position = element.selectionStart;

    state.search = element.value;
    render();

    const search = $("#search");

    search?.focus();
    search?.setSelectionRange(position, position);
  }

  if (element.id === "new-password") {
    const value = element.value;

    const score =
      (value.length >= 8 ? 1 : 0) +
      (/[A-Z]/.test(value) && /[a-z]/.test(value) ? 1 : 0) +
      (/\d/.test(value) ? 1 : 0) +
      (/[^A-Za-z0-9]/.test(value) ? 1 : 0);

    const fill = $("#strength-fill");
    const text = $("#strength-text");

    if (fill) {
      fill.style.width = value
        ? Math.max(18, score * 25) + "%"
        : "0";

      fill.style.background =
        score <= 1 ? "#e34b64"
        : score <= 2 ? "#f2a000"
        : "#12a66a";
    }

    if (text) {
      text.textContent = !value
        ? "Password strength will appear here."
        : score <= 1
          ? "Weak password"
          : score <= 2
            ? "Medium password"
            : "Strong password";
    }
  }
});

/* FORM SUBMISSIONS */

document.addEventListener("submit", event => {
  if (event.target.id === "auth-form") {
    event.preventDefault();
    submitAuth(event.target);
  }

  if (event.target.id === "task-form") {
    event.preventDefault();
    saveTask(event.target);
  }

  if (event.target.id === "password-form") {
    event.preventDefault();
    changePassword(event.target);
  }
});

/* KEYBOARD SUPPORT */

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && state.modal) {
    state.modal = null;
    render();
  }
});

/* START APPLICATION */

render();

