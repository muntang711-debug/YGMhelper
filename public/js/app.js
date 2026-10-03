(() => {
  "use strict";

  const state = {
    view: "meal",
    date: new Date(),
    grade: "1",
    className: "1",
    theme: null,
    calendarOpen: false,
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  };

  const els = {
    root: document.documentElement,
    themeToggle: document.getElementById("theme-toggle"),
    views: {
      meal: document.getElementById("view-meal"),
      timetable: document.getElementById("view-timetable")
    },
    status: {
      meal: document.getElementById("meal-status"),
      timetable: document.getElementById("timetable-status")
    },
    cards: {
      meal: document.getElementById("meal-card"),
      timetable: document.getElementById("timetable-card")
    }
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatDateParam(date) {
    return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("");
  }

  function formatDateLabel(date) {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    }).format(date);
  }

  function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  function setStatus(kind, message) {
    const el = els.status[kind];
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      el.removeAttribute("data-tone");
      return;
    }
    el.hidden = false;
    el.textContent = message;
    if (message.includes("불러오지 못")) el.dataset.tone = "error";
    else delete el.dataset.tone;
  }

  function loading(kind) {
    els.cards[kind].innerHTML = `
      <div class="loading-state">
        <div class="loading-line wide"></div>
        <div class="loading-line"></div>
        <div class="loading-line"></div>
        <div class="loading-line short"></div>
      </div>`;
  }

  function resolveInitialTheme() {
    const saved = localStorage.getItem("ygmhelper-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme, persist = false) {
    state.theme = theme;
    els.root.dataset.theme = theme;
    if (persist) localStorage.setItem("ygmhelper-theme", theme);
  }

  function initTheme() {
    applyTheme(resolveInitialTheme(), false);
    els.themeToggle.addEventListener("click", () => {
      applyTheme(state.theme === "dark" ? "light" : "dark", true);
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", () => {
      if (!localStorage.getItem("ygmhelper-theme")) applyTheme(media.matches ? "dark" : "light", false);
    });
  }

  function buildDateControl(container, key) {
    renderDateControl(container, key);
  }

  function renderDateControl(container, key) {
    container.innerHTML = `
      <button class="date-trigger" type="button" aria-haspopup="dialog" aria-expanded="false">
        <span>${escapeHtml(formatDateLabel(state.date))}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
      </button>`;
    const trigger = container.querySelector(".date-trigger");
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      document.querySelectorAll(".date-picker").forEach((picker) => picker.remove());
      state.calendarOpen = true;
      trigger.setAttribute("aria-expanded", "true");
      container.appendChild(renderCalendar(key, container, trigger));
    });
  }

  function renderCalendar(key, container, trigger) {
    const picker = document.createElement("div");
    picker.className = "date-picker";
    picker.setAttribute("role", "dialog");
    picker.setAttribute("aria-label", "날짜 선택");
    const month = state.calendarMonth;
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startIndex = firstDay.getDay();
    const days = Math.ceil((startIndex + lastDay.getDate()) / 7) * 7;
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    let cells = "";
    for (let i = 0; i < days; i++) {
      const dayOffset = i - startIndex + 1;
      const date = new Date(month.getFullYear(), month.getMonth(), dayOffset);
      const outside = date.getMonth() !== month.getMonth();
      const selected = isSameDate(date, state.date);
      const today = isSameDate(date, new Date());
      cells += `<button class="calendar-day${outside ? " is-outside" : ""}${selected ? " is-selected" : ""}${today ? " is-today" : ""}" type="button" data-date="${formatDateParam(date)}">${date.getDate()}</button>`;
    }

    picker.innerHTML = `
      <div class="calendar-head">
        <button type="button" class="calendar-nav" data-cal-nav="-1" aria-label="이전 달">
          <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg>
        </button>
        <div class="calendar-title">${month.getFullYear()}년 ${month.getMonth() + 1}월</div>
        <button type="button" class="calendar-nav" data-cal-nav="1" aria-label="다음 달">
          <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>
        </button>
      </div>
      <div class="calendar-weekdays">${weekdays.map(day => `<div class="calendar-weekday">${day}</div>`).join("")}</div>
      <div class="calendar-grid">${cells}</div>`;

    picker.addEventListener("click", (event) => {
      const nav = event.target.closest("[data-cal-nav]");
      if (nav) {
        month.setMonth(month.getMonth() + Number(nav.dataset.calNav));
        const fresh = renderCalendar(key, container, trigger);
        picker.replaceWith(fresh);
        return;
      }
      const dateButton = event.target.closest("[data-date]");
      if (!dateButton) return;
      const value = dateButton.dataset.date;
      state.date = new Date(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6)));
      state.calendarMonth = new Date(state.date.getFullYear(), state.date.getMonth(), 1);
      closeCalendars();
      syncDateControls();
      refreshCurrentView();
    });

    return picker;
  }

  function syncDateControls() {
    document.querySelectorAll("[data-date-control] .date-trigger span").forEach((el) => {
      el.textContent = formatDateLabel(state.date);
    });
  }

  function closeCalendars() {
    document.querySelectorAll(".date-picker").forEach((picker) => picker.remove());
    document.querySelectorAll(".date-trigger[aria-expanded='true']").forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
    state.calendarOpen = false;
  }

  function setupSelect(name, options, defaultValue, onChange) {
    const root = document.querySelector(`[data-select="${name}"]`);
    const trigger = root.querySelector(".select-trigger");
    const value = root.querySelector(".select-value");
    const menu = root.querySelector(".select-menu");
    let current = defaultValue;

    function render() {
      menu.innerHTML = options.map((option) => `
        <button class="select-option${option.value === current ? " is-selected" : ""}" type="button" role="option" aria-selected="${option.value === current}" data-value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>`
      ).join("");
      value.textContent = options.find(option => option.value === current)?.label ?? "";
    }

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      closeCalendars();
      document.querySelectorAll(".custom-select.is-open").forEach((node) => {
        if (node !== root) node.classList.remove("is-open");
      });
      root.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", String(root.classList.contains("is-open")));
    });

    menu.addEventListener("click", (event) => {
      const option = event.target.closest(".select-option");
      if (!option) return;
      current = option.dataset.value;
      root.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      render();
      onChange(current);
    });

    render();
    return { get: () => current, set: (newValue) => { current = newValue; render(); } };
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      throw new Error(body?.error || "요청을 처리하지 못했습니다.");
    }
    return body;
  }

  function renderMeal(data) {
    if (!data?.items?.length) {
      els.cards.meal.innerHTML = `
        <div class="empty-state">
          <div>
            <h3>급식 정보가 없습니다.</h3>
            <p>선택한 날짜에는 등록된 급식 데이터가 없습니다.</p>
          </div>
        </div>`;
      return;
    }

    els.cards.meal.innerHTML = `
      <div class="meal-date-label">${escapeHtml(formatDateLabel(state.date))}</div>
      <div class="meal-content">
        <h3 class="meal-title">중식</h3>
        <ul class="meal-list">
          ${data.items.map(item => `<li class="meal-item">${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
      ${data.calories ? `<div class="meal-meta">열량 ${escapeHtml(data.calories)}</div>` : ""}`;
  }

  function renderTimetable(data) {
    if (!data?.items?.length) {
      els.cards.timetable.innerHTML = `
        <div class="empty-state">
          <div>
            <h3>시간표가 없습니다.</h3>
            <p>선택한 학급과 날짜에는 등록된 시간표 데이터가 없습니다.</p>
          </div>
        </div>`;
      return;
    }

    const items = [...data.items].sort((a, b) => Number(a.period) - Number(b.period));
    els.cards.timetable.innerHTML = `
      <div class="timetable-list">
        ${items.map(item => `
          <div class="period-row">
            <div class="period-label">${escapeHtml(item.period)}교시</div>
            <div class="subject">${escapeHtml(item.subject || "수업 정보 없음")}</div>
          </div>`).join("")}
      </div>`;
  }

  async function loadMeal() {
    loading("meal");
    setStatus("meal", "");
    try {
      const data = await fetchJson(`/api/meal?date=${formatDateParam(state.date)}`);
      renderMeal(data);
    } catch (error) {
      els.cards.meal.innerHTML = `
        <div class="empty-state">
          <div>
            <h3>급식을 불러오지 못했습니다.</h3>
            <p>잠시 후 다시 시도해주세요.</p>
          </div>
        </div>`;
      setStatus("meal", error.message || "급식 정보를 불러오지 못했습니다.");
    }
  }

  async function loadTimetable() {
    loading("timetable");
    setStatus("timetable", "");
    try {
      const data = await fetchJson(`/api/timetable?date=${formatDateParam(state.date)}&grade=${encodeURIComponent(state.grade)}&class=${encodeURIComponent(state.className)}`);
      renderTimetable(data);
    } catch (error) {
      els.cards.timetable.innerHTML = `
        <div class="empty-state">
          <div>
            <h3>시간표를 불러오지 못했습니다.</h3>
            <p>잠시 후 다시 시도해주세요.</p>
          </div>
        </div>`;
      setStatus("timetable", error.message || "시간표를 불러오지 못했습니다.");
    }
  }

  function refreshCurrentView() {
    if (state.view === "meal") loadMeal();
    else loadTimetable();
  }

  function switchView(view) {
    state.view = view;
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === view);
    });
    Object.entries(els.views).forEach(([key, node]) => node.hidden = key !== view);
    closeCalendars();
    refreshCurrentView();
  }

  function init() {
    initTheme();

    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.view));
    });

    document.querySelectorAll("[data-date-control]").forEach((container) => {
      buildDateControl(container, container.dataset.dateControl);
    });

    setupSelect("grade", [1,2,3].map(value => ({ value: String(value), label: value + "학년" })), state.grade, (value) => {
      state.grade = value;
      refreshCurrentView();
    });

    setupSelect("class", Array.from({length: 15}, (_, index) => index + 1).map(value => ({ value: String(value), label: value + "반" })), state.className, (value) => {
      state.className = value;
      refreshCurrentView();
    });

    document.addEventListener("click", () => {
      closeCalendars();
      document.querySelectorAll(".custom-select.is-open").forEach((node) => {
        node.classList.remove("is-open");
        node.querySelector(".select-trigger")?.setAttribute("aria-expanded", "false");
      });
    });

    loadMeal();
  }

  init();
})();
