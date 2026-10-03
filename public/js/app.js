(() => {
  "use strict";

  const state = {
    mobileView: "meal",
    date: new Date(),
    grade: "1",
    className: "1",
    theme: null,
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    calendarOpen: false
  };

  const els = {
    root: document.documentElement,
    body: document.body,
    themeToggle: document.getElementById("theme-toggle"),
    mobileSwitch: document.querySelector(".mobile-switch"),
    dateControl: document.querySelector(".global-toolbar .date-control"),
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
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
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

  function setLoading(kind) {
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
    applyTheme(resolveInitialTheme());

    els.themeToggle.addEventListener("click", () => {
      applyTheme(state.theme === "dark" ? "light" : "dark", true);
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", () => {
      if (!localStorage.getItem("ygmhelper-theme")) {
        applyTheme(media.matches ? "dark" : "light");
      }
    });
  }

  function closeDatePicker() {
    document.querySelector(".date-picker")?.remove();
    document.querySelector(".date-trigger")?.setAttribute("aria-expanded", "false");
    state.calendarOpen = false;
  }

  function closeSelects(except = null) {
    document.querySelectorAll(".custom-select.is-open").forEach((node) => {
      if (node !== except) {
        node.classList.remove("is-open");
        node.querySelector(".select-trigger")?.setAttribute("aria-expanded", "false");
      }
    });
  }

  function closeFloatingMenus() {
    closeDatePicker();
    closeSelects();
  }

  function renderDateControl() {
    els.dateControl.innerHTML = `
      <button class="date-trigger" type="button" aria-haspopup="dialog" aria-expanded="false">
        <span>${escapeHtml(formatDateLabel(state.date))}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
      </button>`;

    const trigger = els.dateControl.querySelector(".date-trigger");

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      closeSelects();

      if (state.calendarOpen) {
        closeDatePicker();
        return;
      }

      closeDatePicker();
      trigger.setAttribute("aria-expanded", "true");
      state.calendarOpen = true;
      els.dateControl.appendChild(renderCalendar());
    });
  }

  function calendarMarkup() {
    const month = state.calendarMonth;
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startIndex = firstDay.getDay();
    const totalCells = Math.ceil((startIndex + lastDay.getDate()) / 7) * 7;
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    let cells = "";

    for (let i = 0; i < totalCells; i += 1) {
      const date = new Date(month.getFullYear(), month.getMonth(), i - startIndex + 1);
      const outside = date.getMonth() !== month.getMonth();
      const selected = isSameDate(date, state.date);
      const today = isSameDate(date, new Date());

      cells += `
        <button
          class="calendar-day${outside ? " is-outside" : ""}${selected ? " is-selected" : ""}${today ? " is-today" : ""}"
          type="button"
          data-date="${formatDateParam(date)}"
        >${date.getDate()}</button>`;
    }

    return `
      <div class="calendar-head">
        <button type="button" class="calendar-nav" data-cal-nav="-1" aria-label="이전 달">
          <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg>
        </button>
        <div class="calendar-title">${month.getFullYear()}년 ${month.getMonth() + 1}월</div>
        <button type="button" class="calendar-nav" data-cal-nav="1" aria-label="다음 달">
          <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>
        </button>
      </div>
      <div class="calendar-weekdays">
        ${weekdays.map((day) => `<div class="calendar-weekday">${day}</div>`).join("")}
      </div>
      <div class="calendar-grid">${cells}</div>`;
  }

  function renderCalendar() {
    const picker = document.createElement("div");
    picker.className = "date-picker";
    picker.setAttribute("role", "dialog");
    picker.setAttribute("aria-label", "날짜 선택");
    picker.innerHTML = calendarMarkup();

    picker.addEventListener("click", (event) => {
      event.stopPropagation();

      const nav = event.target.closest("[data-cal-nav]");
      if (nav) {
        state.calendarMonth.setMonth(
          state.calendarMonth.getMonth() + Number(nav.dataset.calNav)
        );
        const freshPicker = renderCalendar();
        picker.replaceWith(freshPicker);
        return;
      }

      const dateButton = event.target.closest("[data-date]");
      if (!dateButton) return;

      const value = dateButton.dataset.date;
      state.date = new Date(
        Number(value.slice(0, 4)),
        Number(value.slice(4, 6)) - 1,
        Number(value.slice(6))
      );
      state.calendarMonth = new Date(
        state.date.getFullYear(),
        state.date.getMonth(),
        1
      );

      closeDatePicker();
      syncDateControl();
      refreshData();
    });

    return picker;
  }

  function syncDateControl() {
    els.dateControl.querySelector(".date-trigger span").textContent = formatDateLabel(state.date);
  }

  function setupSelect(name, options, defaultValue, onChange) {
    const root = document.querySelector(`[data-select="${name}"]`);
    const trigger = root.querySelector(".select-trigger");
    const value = root.querySelector(".select-value");
    const menu = root.querySelector(".select-menu");
    let current = defaultValue;

    function renderOptions() {
      menu.innerHTML = options.map((option) => `
        <button
          class="select-option${option.value === current ? " is-selected" : ""}"
          type="button"
          role="option"
          aria-selected="${option.value === current}"
          data-value="${escapeHtml(option.value)}"
        >${escapeHtml(option.label)}</button>`).join("");

      value.textContent = options.find((option) => option.value === current)?.label ?? "";
    }

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      closeDatePicker();
      const isOpen = root.classList.contains("is-open");
      closeSelects(root);

      if (isOpen) {
        root.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      } else {
        root.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });

    menu.addEventListener("click", (event) => {
      event.stopPropagation();
      const option = event.target.closest(".select-option");
      if (!option) return;

      current = option.dataset.value;
      root.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      renderOptions();
      onChange(current);
    });

    renderOptions();

    return {
      get: () => current,
      set: (next) => {
        current = next;
        renderOptions();
      }
    };
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

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
          ${data.items.map((item) => `<li class="meal-item">${escapeHtml(item)}</li>`).join("")}
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
        ${items.map((item) => `
          <div class="period-row">
            <div class="period-label">${escapeHtml(item.period)}교시</div>
            <div class="subject">${escapeHtml(item.subject || "수업 정보 없음")}</div>
          </div>`).join("")}
      </div>`;
  }

  async function loadMeal() {
    setLoading("meal");
    setStatus("meal", "");

    try {
      renderMeal(await fetchJson(`/api/meal?date=${formatDateParam(state.date)}`));
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
    setLoading("timetable");
    setStatus("timetable", "");

    try {
      renderTimetable(await fetchJson(
        `/api/timetable?date=${formatDateParam(state.date)}&grade=${encodeURIComponent(state.grade)}&class=${encodeURIComponent(state.className)}`
      ));
    } catch (error) {
      els.cards.timetable.innerHTML = `
        <div class="empty-state">
          <div>
            <h3>시간표를 불러오지 못했습니다.</h3>
            <p>잠시 후 다시 시도해주세요.</p>
          </div>
        </div>`;
      setStatus("timetable", error.message || "시간표 정보를 불러오지 못했습니다.");
    }
  }

  function refreshData() {
    loadMeal();

    if (window.innerWidth > 760 || state.mobileView === "timetable") {
      loadTimetable();
    }
  }

  function switchMobileView(view) {
    state.mobileView = view;
    els.body.dataset.mobileView = view;

    document.querySelectorAll(".nav-item").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });

    closeFloatingMenus();

    if (window.innerWidth <= 760) {
      if (view === "meal") loadMeal();
      else loadTimetable();
    }
  }

  function init() {
    initTheme();
    renderDateControl();

    setupSelect(
      "grade",
      [1, 2, 3].map((value) => ({ value: String(value), label: `${value}학년` })),
      state.grade,
      (value) => {
        state.grade = value;
        if (window.innerWidth > 760 || state.mobileView === "timetable") loadTimetable();
      }
    );

    setupSelect(
      "class",
      Array.from({ length: 15 }, (_, index) => index + 1)
        .map((value) => ({ value: String(value), label: `${value}반` })),
      state.className,
      (value) => {
        state.className = value;
        if (window.innerWidth > 760 || state.mobileView === "timetable") loadTimetable();
      }
    );

    els.mobileSwitch.querySelectorAll(".nav-item").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        switchMobileView(button.dataset.view);
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".date-control")) closeDatePicker();
      if (!event.target.closest(".custom-select")) closeSelects();
    });

    let lastIsDesktop = window.innerWidth > 760;
    window.addEventListener("resize", () => {
      const isDesktop = window.innerWidth > 760;
      if (isDesktop === lastIsDesktop) return;
      lastIsDesktop = isDesktop;
      if (isDesktop) {
        closeFloatingMenus();
        loadMeal();
        loadTimetable();
      } else {
        switchMobileView(state.mobileView);
      }
    });

    loadMeal();
    if (window.innerWidth > 760) loadTimetable();
  }

  init();
})();
