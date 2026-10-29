import { civilDate, kstToday, dateParam, selectableRange, parseMealText, createSafeStorage, createRequestTracker } from "./common.js";

(() => {
  "use strict";

  const storage = createSafeStorage(() => localStorage);
  const requests = createRequestTracker();

  const state = {
    mobileView: "meal",
    date: kstToday(),
    grade: /^[1-3]$/.test(storage.getItem("ygmhelper-grade") || "") ? storage.getItem("ygmhelper-grade") : "1",
    className: /^\d{1,2}$/.test(storage.getItem("ygmhelper-class") || "") ? storage.getItem("ygmhelper-class") : "1",
    theme: null,
    calendarMonth: civilDate(kstToday().getUTCFullYear(), kstToday().getUTCMonth(), 1),
    calendarOpen: false,
    calendarDraftDate: kstToday()
  };

  const MEAL_RATING_OPTIONS = [
    { value: 5, label: "매우 맛있음", emoji: "🤩" },
    { value: 4, label: "맛있음", emoji: "😋" },
    { value: 3, label: "갈만함", emoji: "🙂" },
    { value: 2, label: "안 가도 됨", emoji: "😐" },
    { value: 1, label: "가지 마", emoji: "🙅" }
  ];

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

  const clampDay = (year, monthIndex, day) => Math.min(
    day,
    civilDate(year, monthIndex + 1, 0).getUTCDate()
  );

  const pad = (value) => String(value).padStart(2, "0");

  function formatDateParam(date) {
    return [date.getUTCFullYear(), pad(date.getUTCMonth() + 1), pad(date.getUTCDate())].join("");
  }

  function schoolYear(date) {
    if (date instanceof Date) {
      const year = date.getUTCFullYear();
      return date.getUTCMonth() >= 2 ? year : year - 1;
    }

    const value = String(date);
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      throw new Error("날짜를 학사연도로 변환할 수 없습니다.");
    }

    return month >= 3 ? year : year - 1;
  }

  function formatDateLabel(date) {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    }).format(date);
  }

  function isSameDate(a, b) {
    return a.getUTCFullYear() === b.getUTCFullYear()
      && a.getUTCMonth() === b.getUTCMonth()
      && a.getUTCDate() === b.getUTCDate();
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

  function setStatus(kind, message, tone = "") {
    const el = els.status[kind];
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      el.removeAttribute("data-tone");
      return;
    }

    el.hidden = false;
    el.textContent = message;
    if (tone) el.dataset.tone = tone;
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
    const saved = storage.getItem("ygmhelper-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme, persist = false) {
    state.theme = theme;
    els.root.dataset.theme = theme;
    if (persist) storage.setItem("ygmhelper-theme", theme);
  }

  function initTheme() {
    applyTheme(resolveInitialTheme());

    els.themeToggle.addEventListener("click", () => {
      applyTheme(state.theme === "dark" ? "light" : "dark", true);
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", () => {
      if (!storage.getItem("ygmhelper-theme")) {
        applyTheme(media.matches ? "dark" : "light");
      }
    });
  }

  function closeDatePicker() {
    const restoreFocus = document.activeElement?.closest(".date-picker");
    document.querySelector(".date-picker")?.remove();
    document.querySelector(".date-trigger")?.setAttribute("aria-expanded", "false");
    state.calendarOpen = false;
    state.calendarDraftDate = new Date(state.date);
    if (restoreFocus) els.dateControl.querySelector(".date-trigger")?.focus();
  }

  function closeSelects(except = null) {
    document.querySelectorAll(".custom-select.is-open").forEach((node) => {
      if (node !== except) {
        const restoreFocus = node.contains(document.activeElement);
        node.classList.remove("is-open");
        node.querySelector(".select-trigger")?.setAttribute("aria-expanded", "false");
        if (restoreFocus) node.querySelector(".select-trigger")?.focus();
      }
    });
  }

  function closeFloatingMenus() {
    closeDatePicker();
    closeSelects();
  }

  function syncDateControl() {
    const label = els.dateControl.querySelector(".date-trigger span");
    if (label) label.textContent = formatDateLabel(state.date);
  }

  function startOfDay(date) {
    return civilDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  function startOfMonth(date) {
    return civilDate(date.getUTCFullYear(), date.getUTCMonth(), 1);
  }

  function dateKey(date) {
    return [
      date.getUTCFullYear(),
      pad(date.getUTCMonth() + 1),
      pad(date.getUTCDate())
    ].join("-");
  }

  function getSelectableDateRange(now = kstToday()) {
    return selectableRange(now);
  }

  function isDateSelectable(date) {
    const { minDate, maxDate } = getSelectableDateRange();
    const value = startOfDay(date);
    return value >= minDate && value <= maxDate;
  }

  function canNavigateToMonth(year, monthIndex) {
    const { minDate, maxDate } = getSelectableDateRange();
    const monthStart = startOfMonth(civilDate(year, monthIndex, 1));
    const monthEnd = civilDate(year, monthIndex + 1, 0);
    return monthEnd >= minDate && monthStart <= maxDate;
  }

  function getClosedReason(date) {
    // Registered upstream data is authoritative; do not hide it with guessed holidays.
    return [0, 6].includes(date.getUTCDay()) ? { type: "weekend" } : null;
  }

  function makeDraftDate() {
    state.calendarDraftDate = civilDate(
      state.date.getUTCFullYear(),
      state.date.getUTCMonth(),
      state.date.getUTCDate()
    );
    state.calendarMonth = civilDate(
      state.calendarDraftDate.getUTCFullYear(),
      state.calendarDraftDate.getUTCMonth(),
      1
    );
  }

  function shiftCalendarMonth(delta) {
    const nextMonth = civilDate(
      state.calendarMonth.getUTCFullYear(),
      state.calendarMonth.getUTCMonth() + delta,
      1
    );

    if (!canNavigateToMonth(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth())) {
      return false;
    }

    const nextDay = clampDay(
      nextMonth.getUTCFullYear(),
      nextMonth.getUTCMonth(),
      state.calendarDraftDate.getUTCDate()
    );
    const proposedDate = civilDate(
      nextMonth.getUTCFullYear(),
      nextMonth.getUTCMonth(),
      nextDay
    );
    const { minDate, maxDate } = getSelectableDateRange();

    state.calendarMonth = nextMonth;
    state.calendarDraftDate = startOfDay(proposedDate) < minDate
      ? new Date(minDate)
      : startOfDay(proposedDate) > maxDate
        ? new Date(maxDate)
        : proposedDate;

    return true;
  }

  function calendarDaysMarkup() {
    const month = state.calendarMonth;
    const { minDate, maxDate } = getSelectableDateRange();
    const firstDay = civilDate(month.getUTCFullYear(), month.getUTCMonth(), 1);
    const lastDay = civilDate(month.getUTCFullYear(), month.getUTCMonth() + 1, 0);
    const startIndex = firstDay.getUTCDay();
    const totalCells = Math.ceil((startIndex + lastDay.getUTCDate()) / 7) * 7;
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const previousMonth = civilDate(month.getUTCFullYear(), month.getUTCMonth() - 1, 1);
    const nextMonth = civilDate(month.getUTCFullYear(), month.getUTCMonth() + 1, 1);
    const canPrevious = canNavigateToMonth(previousMonth.getUTCFullYear(), previousMonth.getUTCMonth());
    const canNext = canNavigateToMonth(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth());

    let cells = "";

    for (let i = 0; i < totalCells; i += 1) {
      const date = civilDate(month.getUTCFullYear(), month.getUTCMonth(), i - startIndex + 1);
      const outside = date.getUTCMonth() !== month.getUTCMonth();
      const selectable = !outside && startOfDay(date) >= startOfDay(minDate) && startOfDay(date) <= startOfDay(maxDate);
      const selected = isSameDate(date, state.calendarDraftDate);
      const today = isSameDate(date, kstToday());
      const closed = getClosedReason(date);

      cells += `
        <button
          class="calendar-day${outside ? " is-outside" : ""}${selected && selectable ? " is-selected" : ""}${today ? " is-today" : ""}${closed ? " is-closed" : ""}${!selectable ? " is-disabled" : ""}"
          type="button"
          data-date="${formatDateParam(date)}"
          aria-label="${formatDateLabel(date)}"
          aria-pressed="${selected && selectable}"
          tabindex="${selected && selectable ? "0" : "-1"}"
          ${today ? 'aria-current="date"' : ""}
          ${selectable ? "" : "disabled"}
        >${date.getUTCDate()}</button>`;
    }

    return `
      <div class="calendar-head">
        <button type="button" class="calendar-nav" data-cal-nav="-1" aria-label="이전 달"${canPrevious ? "" : " disabled"}>
          <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg>
        </button>
        <div class="calendar-title" aria-label="현재 선택한 달">
          ${month.getUTCFullYear()}년 ${month.getUTCMonth() + 1}월
        </div>
        <button type="button" class="calendar-nav" data-cal-nav="1" aria-label="다음 달"${canNext ? "" : " disabled"}>
          <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>
        </button>
      </div>
      <div class="calendar-weekdays">
        ${weekdays.map((day) => `<div class="calendar-weekday">${day}</div>`).join("")}
      </div>
      <div class="calendar-grid">${cells}</div>`;
  }

  function renderCalendar(picker) {
    picker.innerHTML = calendarDaysMarkup();
  }

  function focusCalendarDay(picker) {
    picker.querySelector(`[data-date="${formatDateParam(state.calendarDraftDate)}"]:not(:disabled)`)?.focus();
  }

  function openDatePicker() {
    closeSelects();
    closeDatePicker();

    makeDraftDate();

    const picker = document.createElement("div");
    picker.className = "date-picker";
    picker.setAttribute("role", "dialog");
    picker.setAttribute("aria-label", "날짜 선택");
    picker.id = "date-picker";
    state.calendarOpen = true;
    picker.addEventListener("click", (event) => {
      event.stopPropagation();

      const nav = event.target.closest("[data-cal-nav]");
      if (nav) {
        const delta = Number(nav.dataset.calNav);
        if (shiftCalendarMonth(delta)) {
          picker.classList.toggle("is-month-forward", delta > 0);
          picker.classList.toggle("is-month-backward", delta < 0);
          renderCalendar(picker);
          focusCalendarDay(picker);
        }
        return;
      }

      const dateButton = event.target.closest("[data-date]");
      if (!dateButton) return;

      const value = dateButton.dataset.date;
      state.date = civilDate(
        Number(value.slice(0, 4)),
        Number(value.slice(4, 6)) - 1,
        Number(value.slice(6))
      );
      closeDatePicker();
      syncDateControl();
      refreshData();
    });

    picker.addEventListener("keydown", event => {
      const button = event.target.closest("[data-date]");
      if (!button) return;
      const offsets = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7};
      if (!(event.key in offsets)) return;
      event.preventDefault();
      const current = civilDate(Number(button.dataset.date.slice(0, 4)), Number(button.dataset.date.slice(4, 6)) - 1, Number(button.dataset.date.slice(6, 8)));
      current.setUTCDate(current.getUTCDate() + offsets[event.key]);
      if (!isDateSelectable(current)) return;
      state.calendarDraftDate = current;
      state.calendarMonth = startOfMonth(current);
      renderCalendar(picker);
      focusCalendarDay(picker);
    });

    renderCalendar(picker);
    els.dateControl.appendChild(picker);
    // Start the entrance animation only after the popup is attached and has a painted initial state.
    requestAnimationFrame(() => {
      if (picker.isConnected) picker.classList.add("is-opening");
    });

    els.dateControl.querySelector(".date-trigger").setAttribute("aria-expanded", "true");
    focusCalendarDay(picker);
  }

  function renderDateControl() {
    syncDateControl();

    const trigger = els.dateControl.querySelector(".date-trigger");
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      if (state.calendarOpen) closeDatePicker();
      else openDatePicker();
    });
  }

  function setupSelect(name, initialOptions, defaultValue, onChange) {
    const root = document.querySelector(`[data-select="${name}"]`);
    const trigger = root.querySelector(".select-trigger");
    const value = root.querySelector(".select-value");
    const menu = root.querySelector(".select-menu");
    menu.id = `${name}-options`;
    menu.setAttribute("aria-label", name === "grade" ? "학년" : "반");
    trigger.setAttribute("aria-controls", menu.id);
    let options = [...initialOptions];
    let current = options.some((option) => option.value === defaultValue)
      ? defaultValue
      : (options[0]?.value || "");
    let disabled = false;

    function renderOptions() {
      menu.innerHTML = options.map((option, index) => `
        <button
          class="select-option${option.value === current ? " is-selected" : ""}"
          style="--option-index:${index}"
          type="button"
          role="option"
          aria-selected="${option.value === current}"
          tabindex="${option.value === current ? "0" : "-1"}"
          data-value="${escapeHtml(option.value)}"
        >${escapeHtml(option.label)}</button>`).join("");

      value.textContent = options.find((option) => option.value === current)?.label ?? "";
      trigger.disabled = disabled;
      trigger.setAttribute("aria-disabled", String(disabled));
      trigger.setAttribute("aria-label", `${name === "grade" ? "학년" : "반"} 선택, ${value.textContent}`);
    }

    function openAndFocus(index) {
      if (disabled) return;
      closeDatePicker(); closeSelects(root);
      root.classList.add("is-open"); trigger.setAttribute("aria-expanded", "true");
      const buttons = menu.querySelectorAll(".select-option");
      const selected = options.findIndex(option => option.value === current);
      buttons[Math.max(0, Math.min(buttons.length - 1, index ?? selected))]?.focus();
    }

    root.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault(); closeSelects(); trigger.focus(); return;
      }
      const buttons = Array.from(menu.querySelectorAll(".select-option"));
      const index = buttons.indexOf(document.activeElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openAndFocus(index < 0 ? undefined : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length);
      } else if (index >= 0 && (event.key === "Home" || event.key === "End")) {
        event.preventDefault(); openAndFocus(event.key === "Home" ? 0 : buttons.length - 1);
      }
    });

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      if (disabled) return;

      closeDatePicker();
      const isOpen = root.classList.contains("is-open");
      closeSelects(root);

      if (isOpen) {
        root.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      } else {
        openAndFocus();
      }
    });

    menu.addEventListener("click", (event) => {
      event.stopPropagation();
      if (disabled) return;

      const option = event.target.closest(".select-option");
      if (!option) return;

      current = option.dataset.value;
      root.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      renderOptions();
      trigger.focus();
      onChange(current);
    });

    renderOptions();

    return {
      get: () => current,
      set: (next) => {
        current = next;
        renderOptions();
      },
      setOptions: (nextOptions, preferredValue = current) => {
        options = [...nextOptions];
        current = options.some((option) => option.value === preferredValue)
          ? preferredValue
          : (options[0]?.value || "");
        renderOptions();
      },
      setDisabled: (next) => {
        disabled = Boolean(next);
        root.classList.toggle("is-disabled", disabled);
        if (disabled) {
          root.classList.remove("is-open");
          trigger.setAttribute("aria-expanded", "false");
        }
        renderOptions();
      }
    };
  }

  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    options.signal?.addEventListener("abort", cancel, {once: true});
    if (options.signal?.aborted) cancel();
    const timer = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {...options, signal: controller.signal, headers: {Accept: "application/json", ...options.headers}, cache: "no-store"});
      const body = await response.json().catch(() => null);
      if (controller.signal.aborted) throw new DOMException("Request aborted", "AbortError");
      if (!response.ok || !body?.ok) throw new Error(body?.error || "요청을 처리하지 못했습니다.");
      return body;
    } catch (error) {
      if (controller.signal.aborted && !options.signal?.aborted) throw new Error("응답 대기 시간이 초과되었습니다. 다시 시도해 주세요.");
      throw error;
    } finally {
      window.clearTimeout(timer);
      options.signal?.removeEventListener("abort", cancel);
    }
  }

  function renderClosed(kind, reason) {
    const title = kind === "meal" ? "급식 없음" : "시간표 없음";
    const message = reason.type === "weekend"
      ? (kind === "meal" ? "주말인데 급식을 왜찾음?" : "주말에도 학교를 가고 싶으신가요?")
      : (kind === "meal" ? reason.name + "인데 급식을 왜찾음?" : reason.name + "인데도 학교를 가고 싶으신가요?");

    els.cards[kind].innerHTML =
      '<div class="empty-state"><div><h3>' + escapeHtml(title) + '</h3><p>' +
      escapeHtml(message) + '</p></div></div>';
  }

  const ALLERGENS = {
    1: "난류",
    2: "우유",
    3: "메밀",
    4: "땅콩",
    5: "대두",
    6: "밀",
    7: "고등어",
    8: "게",
    9: "새우",
    10: "돼지고기",
    11: "복숭아",
    12: "토마토",
    13: "아황산류",
    14: "호두",
    15: "닭고기",
    16: "쇠고기",
    17: "오징어",
    18: "조개류(굴·전복·홍합 포함)",
    19: "잣"
  };

  function extractAllergenNumbers(text) { return parseMealText(text).allergens; }

  function cleanMealLabel(text) { return parseMealText(text).label; }

  function removeAllergenModalNow(modal = document.querySelector(".allergen-modal")) {
    if (!modal) return;
    if (modal) {
      const origin = modal._allergenOriginElement;
      if (origin) {
        origin.hidden = false;
        origin.style.visibility = modal._allergenOriginVisibility || "";
      }
      modal.remove();
      els.body.querySelector("#app").inert = Boolean(modal._previousInert);
      if (modal._returnFocus?.isConnected) modal._returnFocus.focus();
    }
    document.body.classList.remove("modal-open");
  }

  function closeAllergenModal() {
    const modal = document.querySelector(".allergen-modal");
    if (!modal || modal.classList.contains("is-closing")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { removeAllergenModalNow(modal); return; }

    const dialog = modal.querySelector(".allergen-dialog");
    const backdrop = modal.querySelector(".allergen-backdrop");
    const origin = modal._allergenOriginElement;
    const sourceRect = modal._allergenSourceRect;

    if (!dialog || !sourceRect || !origin) {
      removeAllergenModalNow(modal);
      return;
    }

    modal.classList.add("is-closing");
    dialog.classList.add("is-closing");
    backdrop?.classList.add("is-closing");

    requestAnimationFrame(() => {
      dialog.style.setProperty("--modal-shift-x", modal._allergenShiftX);
      dialog.style.setProperty("--modal-shift-y", modal._allergenShiftY);
      dialog.style.setProperty("--modal-scale-x", modal._allergenScaleX);
      dialog.style.setProperty("--modal-scale-y", modal._allergenScaleY);
    });

    window.setTimeout(() => removeAllergenModalNow(modal), 430);
  }

  function prepareAllergenMorph(modal, originElement, targetElement) {
    const dialog = modal.querySelector(".allergen-dialog");
    if (!dialog || !originElement) return;

    const sourceRect = originElement.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();

    if (!sourceRect.width || !sourceRect.height || !dialogRect.width || !dialogRect.height) return;

    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    const dialogCenterX = dialogRect.left + dialogRect.width / 2;
    const dialogCenterY = dialogRect.top + dialogRect.height / 2;

    const shiftX = sourceCenterX - dialogCenterX;
    const shiftY = sourceCenterY - dialogCenterY;
    const scaleX = sourceRect.width / dialogRect.width;
    const scaleY = sourceRect.height / dialogRect.height;

    modal._allergenOriginElement = originElement;
    modal._allergenOriginVisibility = originElement.style.visibility;
    modal._allergenSourceRect = sourceRect;
    modal._allergenShiftX = `${shiftX}px`;
    modal._allergenShiftY = `${shiftY}px`;
    modal._allergenScaleX = String(scaleX);
    modal._allergenScaleY = String(scaleY);

    dialog.style.setProperty("--modal-shift-x", modal._allergenShiftX);
    dialog.style.setProperty("--modal-shift-y", modal._allergenShiftY);
    dialog.style.setProperty("--modal-scale-x", modal._allergenScaleX);
    dialog.style.setProperty("--modal-scale-y", modal._allergenScaleY);
    dialog.style.setProperty("--modal-start-radius", getComputedStyle(originElement).borderRadius);

    if (targetElement) {
      const targetRect = targetElement.getBoundingClientRect();
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;
      targetElement.style.setProperty("--trigger-text-x", `${sourceCenterX - targetCenterX}px`);
      targetElement.style.setProperty("--trigger-text-y", `${sourceCenterY - targetCenterY}px`);
      targetElement.style.setProperty(
        "--trigger-text-scale",
        String(Math.min(1.2, Math.max(.65, sourceRect.height / Math.max(targetRect.height, 1))))
      );
      targetElement.classList.add("allergen-trigger-target");
    }

    originElement.style.visibility = "hidden";
    requestAnimationFrame(() => {
      dialog.classList.add("is-opening");
    });
  }

  function activateAllergenModal(modal, originElement) {
    closeFloatingMenus();
    modal._returnFocus = originElement || document.activeElement;
    const app = els.body.querySelector("#app");
    modal._previousInert = app.inert;
    app.inert = true;
    modal.querySelector(".allergen-scroll").tabIndex = 0;
    modal.querySelector(".allergen-close").focus();
    modal.addEventListener("keydown", event => {
      if (event.key !== "Tab") return;
      const focusable = [...modal.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  function openAllergenModal(numbers, menuName = "", originElement = null) {
    removeAllergenModalNow();

    const modal = document.createElement("div");
    modal.className = "allergen-modal";
    modal.innerHTML = `
      <div class="allergen-backdrop" data-allergen-close></div>
      <section class="allergen-dialog" role="dialog" aria-modal="true" aria-labelledby="allergen-title">
        <div class="allergen-header">
          <div>
            <p class="allergen-kicker">ALLERGY</p>
            <h2 id="allergen-title">알레르기 정보</h2>
          </div>
          <button class="allergen-close" type="button" data-allergen-close aria-label="닫기">×</button>
        </div>
        ${menuName ? `<p class="allergen-menu-name">${escapeHtml(menuName)}</p>` : ""}
        <div class="allergen-scroll">
          <div class="allergen-list">
            ${numbers.length ? numbers.map((number, index) => `
              <div class="allergen-row is-used" style="--allergen-index:${index}">
                <span class="allergen-number">${number}</span>
                <span class="allergen-name">${escapeHtml(ALLERGENS[number])}</span>
              </div>`).join("") : '<div class="allergen-empty">표시된 알레르기 번호가 없습니다.</div>'}
          </div>
        </div>
      </section>`;

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-allergen-close]")) closeAllergenModal();
    });

    document.body.appendChild(modal);
    document.body.classList.add("modal-open");

    const target = modal.querySelector(".allergen-number");
    prepareAllergenMorph(modal, originElement, target);
    activateAllergenModal(modal, originElement);
  }

  function openAllergenReferenceModal(numbers = [], originElement = null) {
    removeAllergenModalNow();

    const modal = document.createElement("div");
    modal.className = "allergen-modal";
    modal.innerHTML = `
      <div class="allergen-backdrop" data-allergen-close></div>
      <section class="allergen-dialog" role="dialog" aria-modal="true" aria-labelledby="allergen-title">
        <div class="allergen-header">
          <div>
            <p class="allergen-kicker">ALLERGY</p>
            <h2 id="allergen-title">알레르기 번호 정보</h2>
          </div>
          <button class="allergen-close" type="button" data-allergen-close aria-label="닫기">×</button>
        </div>
        <div class="allergen-scroll">
          <div class="allergen-list">
            ${Object.entries(ALLERGENS).map(([number, name], index) => `
              <div class="allergen-row${numbers.includes(Number(number)) ? " is-used" : ""}" style="--allergen-index:${index}">
                <span class="allergen-number">${number}</span>
                <span class="allergen-name">${escapeHtml(name)}</span>
                ${numbers.includes(Number(number)) ? '<span class="allergen-used">오늘 사용</span>' : ""}
              </div>`).join("")}
          </div>
        </div>
      </section>`;

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-allergen-close]")) closeAllergenModal();
    });

    document.body.appendChild(modal);
    document.body.classList.add("modal-open");

    const target = modal.querySelector("#allergen-title");
    prepareAllergenMorph(modal, originElement, target);
    activateAllergenModal(modal, originElement);
  }

  function createMealVoterId() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" +
      hex.slice(16, 20) + "-" + hex.slice(20);
  }

  function getMealVoterId() {
    const key = "ygmhelper-meal-voter-v1";
    const saved = storage.getItem(key);
    const value = saved && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved) ? saved.toLowerCase() : createMealVoterId();
    storage.setItem(key, value);
    return value;
  }

  function updateMealRatingPanel(panel, data) {
    if (!panel?.isConnected) return;

    const counts = data.counts || {};
    const total = Math.max(0, Number(data.total) || 0);
    const average = total > 0 && Number.isFinite(Number(data.average))
      ? Number(data.average).toFixed(1)
      : "—";
    const averageElement = panel.querySelector(".rating-average");
    const totalElement = panel.querySelector(".rating-count");
    if (averageElement) averageElement.textContent = average;
    if (totalElement) totalElement.textContent = total + "표";

    const mine = Number(data.myRating) || 0;
    panel.querySelectorAll(".meal-rating-option").forEach((button) => {
      const rating = Number(button.dataset.rating);
      const count = Math.max(0, Number(counts[String(rating)]) || 0);
      const countElement = button.querySelector(".meal-rating-option-count");
      const fill = button.querySelector(".meal-rating-option-fill");
      const isSelected = mine === rating;

      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", isSelected ? "true" : "false");
      if (countElement) countElement.textContent = String(count);
      if (fill) fill.style.width = (total ? (count / total) * 100 : 0) + "%";
    });


  }

  function setupMealRating(date) {
    const ratingDate = String(date || formatDateParam(state.date));
    const token = requests.begin("rating", ratingDate, 0, true);
    const voterId = getMealVoterId();
    const panel = document.createElement("section");
    panel.className = "meal-rating-panel";
    panel.setAttribute("aria-label", "급식 맛 평가");
    panel.dataset.date = ratingDate;
    let canVote = ratingDate === dateParam(kstToday());
    let loaded = false;
    let busy = false;
    const title = canVote ? "오늘의 급식 맛 평가" : "선택한 날의 급식 맛 평가";
    panel.innerHTML = '<div class="meal-rating-heading"><div class="meal-rating-copy"><h3 class="meal-rating-title">' + title +
      '</h3></div><div class="meal-rating-summary" aria-live="polite"><strong class="rating-average">—</strong><span class="rating-count">집계 중</span></div></div>' +
      '<div class="meal-rating-options" role="group" aria-label="맛 평가 등급">' + MEAL_RATING_OPTIONS.map(option =>
        '<button class="meal-rating-option" type="button" data-rating="' + option.value + '" aria-pressed="false" disabled>' +
        '<span class="meal-rating-option-label"><span class="meal-rating-emoji" aria-hidden="true">' + option.emoji + '</span><span class="meal-rating-option-name">' + escapeHtml(option.label) +
        '</span></span><span class="meal-rating-option-meter" aria-hidden="true"><span class="meal-rating-option-fill"></span></span><span class="meal-rating-option-count">0</span></button>'
      ).join("") + '</div><p class="meal-rating-status" role="status" hidden></p><button type="button" class="rating-retry" hidden>다시 시도</button>';
    els.cards.meal.appendChild(panel);
    const status = panel.querySelector(".meal-rating-status");
    const retry = panel.querySelector(".rating-retry");
    const live = () => panel.isConnected && token.current();
    const showStatus = message => { status.textContent = message; status.hidden = !message; };
    const syncButtons = () => {
      panel.querySelectorAll(".meal-rating-option").forEach(button => { button.disabled = busy || !loaded || !canVote; });
      retry.disabled = busy;
    };
    async function loadSummary() {
      if (busy || !live()) return;
      busy = true; retry.hidden = true; syncButtons();
      try {
        const data = await fetchJson("/api/meal-rating?date=" + encodeURIComponent(ratingDate), {headers: {"X-Meal-Voter": voterId}, signal: token.signal});
        if (!live()) return;
        loaded = true; canVote = canVote && data.canVote !== false;
        updateMealRatingPanel(panel, data);
        showStatus(canVote ? "" : "평가는 오늘 급식에만 등록할 수 있습니다.");
      } catch (error) {
        if (!live()) return;
        panel.querySelector(".rating-count").textContent = "집계 실패";
        showStatus(error.message || "집계를 불러오지 못했습니다."); retry.hidden = false;
      } finally { busy = false; if (live()) syncButtons(); }
    }
    retry.addEventListener("click", () => { void loadSummary(); });
    panel.querySelectorAll(".meal-rating-option").forEach(button => {
      button.addEventListener("click", async () => {
        if (button.disabled || !live()) return;
        busy = true; syncButtons();
        try {
          const data = await fetchJson("/api/meal-rating", {method: "POST", headers: {"Content-Type": "application/json"}, signal: token.signal,
            body: JSON.stringify({date: ratingDate, voterId, rating: Number(button.dataset.rating)})});
          if (!live()) return;
          updateMealRatingPanel(panel, data); showStatus("");
        } catch (error) { if (live()) showStatus(error.message || "평가를 저장하지 못했습니다. 다시 선택해 주세요."); }
        finally { busy = false; if (live()) syncButtons(); }
      });
    });
    void loadSummary();
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

    const mealAllergenNumbers = [...new Set(data.items.flatMap(item => extractAllergenNumbers(item)))].sort((a, b) => a - b);

    els.cards.meal.innerHTML = `
      <div class="meal-content">
        <ul class="meal-list">
          ${data.items.map((item, index) => {
            const raw = String(item);
            const numbers = extractAllergenNumbers(raw);
            const menuName = cleanMealLabel(raw);
            const numberLabel = numbers.join(".");

            return `<li class="meal-item" style="--meal-index:${index}">
              <span class="meal-name">${escapeHtml(menuName)}</span>
              ${numberLabel ? `<button class="meal-allergen-button" type="button" aria-haspopup="dialog" aria-label="${escapeHtml(menuName)} 알레르기 ${escapeHtml(numberLabel)}">${escapeHtml(numberLabel)}</button>` : ""}
            </li>`;
          }).join("")}
        </ul>
      </div>
      <div class="meal-footer">
        <div class="meal-calories">
          <span class="meal-calories-label">열량</span>
          <strong>${data.calories ? escapeHtml(data.calories) : "정보 없음"}</strong>
        </div>
        <button class="allergy-button" type="button" aria-haspopup="dialog">알레르기 번호 정보</button>
      </div>`;

    els.cards.meal.querySelectorAll(".meal-allergen-button").forEach((button) => {
      button.addEventListener("click", () => {
        const numbers = button.textContent.split(".").map(Number);
        const menuName = button.parentElement?.querySelector(".meal-name")?.textContent || "";
        openAllergenModal(numbers, menuName, button);
      });
    });

    els.cards.meal.querySelector(".allergy-button")?.addEventListener("click", () => {
      openAllergenReferenceModal(mealAllergenNumbers, els.cards.meal.querySelector(".allergy-button"));
    });

    setupMealRating(data.date || formatDateParam(state.date));
  }

  function normalizeTeacherName(value) {
    const raw = String(value || "").replace(/\*/g, "").trim();
    if (!raw) return "";
    return `${raw.slice(0, 2)}*`;
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
        ${items.map((item, index) => {
          const teacher = normalizeTeacherName(item.teacher);
          const location = String(item.location || "").trim();

          return `
            <article class="period-card${item.changed ? " is-changed" : ""}" style="--item-index:${index}">
              <span class="period-card-number">${escapeHtml(item.period)}교시</span>
              <div class="period-card-main">
                <div class="period-card-subject-row">
                  <strong class="period-card-subject">${escapeHtml(item.subject || "수업 정보 없음")}</strong>
                  ${item.changed ? '<span class="period-card-changed">변동</span>' : ""}
                </div>
                ${teacher ? `<span class="period-card-teacher">${escapeHtml(teacher)}</span>` : ""}
                ${location ? `<span class="period-card-location">${escapeHtml(location)}</span>` : ""}
              </div>
            </article>`;
        }).join("")}
      </div>`;
  }

  let classSelect = null;
  let lastRefreshAt = 0;

  function classOptionsCacheKey(date = state.date, grade = state.grade) {
    const day = date.getUTCDay();
    const monday = civilDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - (day === 0 ? 6 : day - 1));
    return formatDateParam(monday) + "-" + grade;
  }

  function classOptionsFromValues(values) {
    return [...new Set((Array.isArray(values) ? values : []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 99))]
      .sort((a, b) => a - b).map(n => ({value: String(n), label: n + "반"}));
  }

  function readCachedClassOptions(date = state.date, grade = state.grade) {
    try {
      const cached = JSON.parse(storage.getItem("ygmhelper-classes-v2-" + classOptionsCacheKey(date, grade)) || "null");
      return cached?.expiresAt > Date.now() && Array.isArray(cached.values) ? cached.values : [];
    } catch { return []; }
  }

  function applyClassOptions(values, persist = true, date = state.date, grade = state.grade) {
    if (formatDateParam(date) !== formatDateParam(state.date) || grade !== state.grade) return false;
    const options = classOptionsFromValues(values);
    if (!options.length) return false;
    const previous = state.className;
    state.className = options.some(option => option.value === previous) ? previous : options[0].value;
    storage.setItem("ygmhelper-class", state.className);
    classSelect?.setOptions(options, state.className);
    classSelect?.setDisabled(false);
    if (persist) storage.setItem("ygmhelper-classes-v2-" + classOptionsCacheKey(date, grade), JSON.stringify({values: options.map(o => Number(o.value)), expiresAt: Date.now() + 3600000}));
    return state.className !== previous;
  }

  async function loadClassOptions(force = false) {
    const date = new Date(state.date), grade = state.grade;
    const token = requests.begin("classes", classOptionsCacheKey(date, grade), 3600000, force);
    if (!token) return;
    const cached = readCachedClassOptions(date, grade);
    if (cached.length) applyClassOptions(cached, false, date, grade);
    let success = false;
    try {
      const data = await fetchJson("/api/classes?date=" + formatDateParam(date) + "&grade=" + grade, {signal: token.signal});
      if (!token.current() || formatDateParam(state.date) !== formatDateParam(date) || state.grade !== grade) return;
      if (!data.classes?.length) throw new Error("해당 학년의 반 정보를 찾을 수 없습니다.");
      applyClassOptions(data.classes, true, date, grade); success = true;
    } catch (error) {
      if (token.current() && state.grade === grade && formatDateParam(state.date) === formatDateParam(date) && !cached.length) setStatus("timetable", error.message, "error");
    } finally { token.finish(success); }
  }

  async function loadMeal({force = false} = {}) {
    const date = new Date(state.date);
    const token = requests.begin("meal", formatDateParam(date), 60000, force);
    if (!token) return;
    requests.cancel("rating");
    removeAllergenModalNow();
    setStatus("meal", "");
    const closedReason = getClosedReason(date);
    if (closedReason) { renderClosed("meal", closedReason); token.finish(true); return; }
    setLoading("meal");
    let success = false;
    try {
      const data = await fetchJson("/api/meal?date=" + formatDateParam(date), {signal: token.signal});
      if (!token.current()) return;
      renderMeal(data); success = true;
    } catch (error) {
      if (!token.current()) return;
      els.cards.meal.innerHTML = '<div class="empty-state"><div><h3>급식을 불러오지 못했습니다.</h3><p>잠시 후 다시 시도해 주세요.</p></div></div>';
      setStatus("meal", error.message, "error");
    } finally { token.finish(success); }
  }

  async function loadTimetable({force = false, retry = false} = {}) {
    const date = new Date(state.date), grade = state.grade, className = state.className;
    const key = formatDateParam(date) + "-" + grade + "-" + className;
    const token = requests.begin("timetable", key, 5000, force);
    if (!token) return;
    setStatus("timetable", "");
    const closedReason = getClosedReason(date);
    if (closedReason) { renderClosed("timetable", closedReason); token.finish(true); void loadClassOptions(); return; }
    setLoading("timetable");
    let success = false;
    try {
      const data = await fetchJson("/api/timetable?date=" + formatDateParam(date) + "&grade=" + grade + "&class=" + className, {signal: token.signal});
      if (!token.current()) return;
      if (data.classes?.length) applyClassOptions(data.classes, true, date, grade);
      if (state.className !== className && !retry) {
        token.finish(true); await loadTimetable({retry: true}); return;
      }
      renderTimetable(data); success = true;
    } catch (error) {
      if (!token.current()) return;
      els.cards.timetable.innerHTML = '<div class="empty-state"><div><h3>시간표를 불러오지 못했습니다.</h3><p>잠시 후 다시 시도해 주세요.</p></div></div>';
      setStatus("timetable", error.message, "error");
    } finally { token.finish(success); }
  }

  function refreshData({force = false} = {}) {
    lastRefreshAt = Date.now();
    void loadMeal({force});
    void loadTimetable({force});
  }

  function switchMobileView(view) {
    state.mobileView = view;
    els.body.dataset.mobileView = view;

    document.querySelectorAll(".nav-item").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
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
        storage.setItem("ygmhelper-grade", value);
        requests.cancel("classes");

        const cached = readCachedClassOptions();
        if (cached.length) {
          applyClassOptions(cached, false);
        } else {
          classSelect?.setOptions(
            [{ value: state.className, label: `${state.className}반` }],
            state.className
          );
          classSelect?.setDisabled(false);
        }

        loadTimetable();
      }
    );

    const cachedInitialClasses = readCachedClassOptions();

    classSelect = setupSelect(
      "class",
      cachedInitialClasses.length
        ? classOptionsFromValues(cachedInitialClasses)
        : [{ value: state.className, label: `${state.className}반` }],
      state.className,
      (value) => {
        if (!value) return;
        state.className = value;
        storage.setItem("ygmhelper-class", value);
        loadTimetable();
      }
    );

    els.mobileSwitch.querySelectorAll(".nav-item").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        switchMobileView(button.dataset.view);
      });
    });

    els.mobileSwitch.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const view = event.key === "Home" ? "meal" : event.key === "End" ? "timetable" : state.mobileView === "meal" ? "timetable" : "meal";
      switchMobileView(view);
      els.mobileSwitch.querySelector(`[data-view="${view}"]`).focus();
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".date-control")) closeDatePicker();
      if (!event.target.closest(".custom-select")) closeSelects();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (document.querySelector(".allergen-modal")) closeAllergenModal();
      else closeFloatingMenus();
    });

    let lastIsDesktop = window.innerWidth > 760;
    window.addEventListener("resize", () => {
      const isDesktop = window.innerWidth > 760;
      if (isDesktop === lastIsDesktop) return;
      lastIsDesktop = isDesktop;

      closeFloatingMenus();

      if (isDesktop) {
        loadMeal();
        loadTimetable();
      } else {
        switchMobileView(state.mobileView);
      }
    });

    let lastToday = formatDateParam(kstToday());
    function resume() {
      if (document.visibilityState === "hidden") return;
      const today = kstToday(), todayKey = formatDateParam(today);
      const changed = todayKey !== lastToday;
      if (changed) {
        if (formatDateParam(state.date) === lastToday || !isDateSelectable(state.date)) state.date = today;
        lastToday = todayKey;
        closeFloatingMenus(); syncDateControl();
      }
      if (changed || Date.now() - lastRefreshAt > 30000) refreshData({force: true});
    }
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.setInterval(() => { if (lastToday !== formatDateParam(kstToday())) resume(); }, 60000);
    refreshData();
  }

  init();
})();
