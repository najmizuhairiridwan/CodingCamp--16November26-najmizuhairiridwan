/* =============================================
   FOCUS DASHBOARD — app.js
   Challenges implemented:
     1. Light / Dark mode
     2. Custom name in greeting
     3. Prevent duplicate tasks
   ============================================= */

// ── Utility: LocalStorage helpers ──────────────
const store = {
  get: (key, fallback = null) => {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

// ── Utility: Toast notification ────────────────
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

// ══════════════════════════════════════════════
//  1. CLOCK & GREETING
// ══════════════════════════════════════════════
function updateClock() {
  const now = new Date();

  // Time
  const timeEl = document.getElementById("time");
  timeEl.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Date
  const dateEl = document.getElementById("date");
  dateEl.textContent = now.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Greeting
  const hour = now.getHours();
  let period;
  if (hour < 12) period = "Good morning";
  else if (hour < 17) period = "Good afternoon";
  else if (hour < 21) period = "Good evening";
  else period = "Good night";

  const name = store.get("userName", "");
  const greetEl = document.getElementById("greeting");
  greetEl.textContent = name ? `${period}, ${name} 👋` : `${period} 👋`;
}

// Name save
(function initName() {
  const input = document.getElementById("name-input");
  const btn = document.getElementById("name-save");
  const saved = store.get("userName", "");
  if (saved) input.value = saved;

  btn.addEventListener("click", () => {
    const name = input.value.trim();
    store.set("userName", name);
    updateClock();
    showToast(name ? `Name saved as "${name}"` : "Name cleared");
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btn.click();
  });
})();

setInterval(updateClock, 1000);
updateClock();

// ══════════════════════════════════════════════
//  2. LIGHT / DARK MODE  (Challenge #1)
// ══════════════════════════════════════════════
(function initTheme() {
  const btn = document.getElementById("theme-toggle");
  const html = document.documentElement;
  const saved = store.get("theme", "dark");
  html.setAttribute("data-theme", saved);
  btn.textContent = saved === "dark" ? "🌙" : "☀️";

  btn.addEventListener("click", () => {
    const current = html.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    btn.textContent = next === "dark" ? "🌙" : "☀️";
    store.set("theme", next);
  });
})();

// ══════════════════════════════════════════════
//  3. FOCUS TIMER  (Pomodoro — changeable time)
// ══════════════════════════════════════════════
(function initTimer() {
  const display   = document.getElementById("timer-display");
  const startBtn  = document.getElementById("timer-start");
  const stopBtn   = document.getElementById("timer-stop");
  const resetBtn  = document.getElementById("timer-reset");
  const statusEl  = document.getElementById("timer-status");
  const minInput  = document.getElementById("custom-minutes");
  const setBtn    = document.getElementById("set-time");

  let totalSeconds  = store.get("timerMinutes", 25) * 60;
  let remaining     = totalSeconds;
  let intervalId    = null;
  let running       = false;

  // Restore saved custom minutes
  minInput.value = store.get("timerMinutes", 25);

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function render() {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    display.textContent = `${pad(m)}:${pad(s)}`;
    display.classList.toggle("warning", remaining <= 60 && remaining > 0);
  }

  function tick() {
    if (remaining <= 0) {
      clearInterval(intervalId);
      running = false;
      startBtn.disabled = false;
      stopBtn.disabled  = true;
      statusEl.textContent = "✅ Session complete! Take a break.";
      showToast("⏰ Focus session done!");
      display.classList.remove("warning");
      return;
    }
    remaining--;
    render();
  }

  startBtn.addEventListener("click", () => {
    if (running) return;
    running = true;
    startBtn.disabled = true;
    stopBtn.disabled  = false;
    statusEl.textContent = "⏳ Focus…";
    intervalId = setInterval(tick, 1000);
  });

  stopBtn.addEventListener("click", () => {
    clearInterval(intervalId);
    running = false;
    startBtn.disabled = false;
    stopBtn.disabled  = true;
    statusEl.textContent = "⏸ Paused";
  });

  resetBtn.addEventListener("click", () => {
    clearInterval(intervalId);
    running = false;
    remaining = totalSeconds;
    startBtn.disabled = false;
    stopBtn.disabled  = true;
    statusEl.textContent = "";
    display.classList.remove("warning");
    render();
  });

  // Challenge: change Pomodoro time
  setBtn.addEventListener("click", () => {
    const mins = parseInt(minInput.value, 10);
    if (isNaN(mins) || mins < 1 || mins > 90) {
      showToast("Enter a value between 1 and 90 minutes");
      return;
    }
    clearInterval(intervalId);
    running = false;
    totalSeconds = mins * 60;
    remaining    = totalSeconds;
    store.set("timerMinutes", mins);
    startBtn.disabled = false;
    stopBtn.disabled  = true;
    statusEl.textContent = `Timer set to ${mins} min`;
    display.classList.remove("warning");
    render();
  });

  render();
})();

// ══════════════════════════════════════════════
//  4. TO-DO LIST
//     Challenges: prevent duplicates, sort tasks
// ══════════════════════════════════════════════
(function initTodo() {
  const input    = document.getElementById("todo-input");
  const addBtn   = document.getElementById("todo-add");
  const listEl   = document.getElementById("todo-list");
  const sortSel  = document.getElementById("sort-select");

  // Task shape: { id, text, done }
  let tasks = store.get("tasks", []);

  function saveTasks() {
    store.set("tasks", tasks);
  }

  function getSorted(arr) {
    const copy = [...arr];
    const mode = sortSel.value;
    if (mode === "az")   return copy.sort((a, b) => a.text.localeCompare(b.text));
    if (mode === "za")   return copy.sort((a, b) => b.text.localeCompare(a.text));
    if (mode === "done") return copy.sort((a, b) => Number(a.done) - Number(b.done));
    return copy; // default: insertion order
  }

  function renderTasks() {
    listEl.innerHTML = "";
    const sorted = getSorted(tasks);
    if (sorted.length === 0) {
      listEl.innerHTML = `<li style="color:var(--text-muted);font-size:0.85rem;padding:8px 0;">No tasks yet. Add one above!</li>`;
      return;
    }
    sorted.forEach((task) => {
      const li = document.createElement("li");
      li.className = `todo-item${task.done ? " done" : ""}`;
      li.dataset.id = task.id;

      li.innerHTML = `
        <input type="checkbox" ${task.done ? "checked" : ""} aria-label="Mark done" />
        <span class="task-text">${escapeHtml(task.text)}</span>
        <button class="btn-edit">Edit</button>
        <button class="btn-delete">✕</button>
      `;

      // Toggle done
      li.querySelector("input[type=checkbox]").addEventListener("change", (e) => {
        task.done = e.target.checked;
        saveTasks();
        renderTasks();
      });

      // Edit
      li.querySelector(".btn-edit").addEventListener("click", () => {
        const span   = li.querySelector(".task-text");
        const editIn = document.createElement("input");
        editIn.type      = "text";
        editIn.value     = task.text;
        editIn.className = "edit-input";
        editIn.maxLength = 100;

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        saveBtn.className   = "btn-save";

        span.replaceWith(editIn);
        li.querySelector(".btn-edit").replaceWith(saveBtn);
        editIn.focus();

        const commit = () => {
          const newText = editIn.value.trim();
          if (!newText) { showToast("Task cannot be empty"); return; }

          // Prevent duplicate on edit (Challenge #3)
          const duplicate = tasks.find(
            (t) => t.id !== task.id && t.text.toLowerCase() === newText.toLowerCase()
          );
          if (duplicate) {
            showToast("A task with that name already exists");
            return;
          }
          task.text = newText;
          saveTasks();
          renderTasks();
        };

        saveBtn.addEventListener("click", commit);
        editIn.addEventListener("keydown", (e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") renderTasks();
        });
      });

      // Delete
      li.querySelector(".btn-delete").addEventListener("click", () => {
        tasks = tasks.filter((t) => t.id !== task.id);
        saveTasks();
        renderTasks();
      });

      listEl.appendChild(li);
    });
  }

  function addTask() {
    const text = input.value.trim();
    if (!text) return;

    // Challenge #3: prevent duplicates
    const duplicate = tasks.find((t) => t.text.toLowerCase() === text.toLowerCase());
    if (duplicate) {
      showToast("That task already exists");
      input.select();
      return;
    }

    tasks.push({ id: Date.now(), text, done: false });
    saveTasks();
    renderTasks();
    input.value = "";
    input.focus();
  }

  addBtn.addEventListener("click", addTask);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });
  sortSel.addEventListener("change", renderTasks);

  renderTasks();
})();

// ══════════════════════════════════════════════
//  5. QUICK LINKS
// ══════════════════════════════════════════════
(function initLinks() {
  const labelInput = document.getElementById("link-label");
  const urlInput   = document.getElementById("link-url");
  const addBtn     = document.getElementById("link-add");
  const grid       = document.getElementById("links-grid");

  // Link shape: { id, label, url }
  let links = store.get("links", []);

  function saveLinks() {
    store.set("links", links);
  }

  function getFavicon(url) {
    try {
      const origin = new URL(url).origin;
      return `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(origin)}`;
    } catch {
      return "";
    }
  }

  function renderLinks() {
    grid.innerHTML = "";
    if (links.length === 0) {
      grid.innerHTML = `<span style="color:var(--text-muted);font-size:0.85rem;">No links saved yet.</span>`;
      return;
    }
    links.forEach((link) => {
      const chip = document.createElement("div");
      chip.className = "link-chip";

      const favicon = getFavicon(link.url);
      chip.innerHTML = `
        ${favicon ? `<img class="link-favicon" src="${favicon}" alt="" loading="lazy" onerror="this.style.display='none'"/>` : ""}
        <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>
        <button class="btn-remove-link" aria-label="Remove link">✕</button>
      `;

      chip.querySelector(".btn-remove-link").addEventListener("click", () => {
        links = links.filter((l) => l.id !== link.id);
        saveLinks();
        renderLinks();
      });

      grid.appendChild(chip);
    });
  }

  function addLink() {
    const label = labelInput.value.trim();
    let   url   = urlInput.value.trim();
    if (!label || !url) { showToast("Enter both a label and a URL"); return; }

    // Auto-prefix protocol
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    try { new URL(url); } catch {
      showToast("That doesn't look like a valid URL");
      return;
    }

    links.push({ id: Date.now(), label, url });
    saveLinks();
    renderLinks();
    labelInput.value = "";
    urlInput.value   = "";
    labelInput.focus();
  }

  addBtn.addEventListener("click", addLink);
  urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addLink(); });

  renderLinks();
})();

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Inject toast container ──────────────────────
(function createToast() {
  const div = document.createElement("div");
  div.id = "toast";
  document.body.appendChild(div);
})();
