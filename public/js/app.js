(() => {
  "use strict";

  const state = {
    mobileView: "meal",
    date: new Date(),
    grade: /^[1-3]$/.test(localStorage.getItem("ygmhelper-grade") || "") ? localStorage.getItem("ygmhelper-grade") : "1",
    className: /^\d{1,2}$/.test(localStorage.getItem("ygmhelper-class") || "") ? localStorage.getItem("ygmhelper-class") : "1",
    theme: null,
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    calendarOpen: false,
    calendarDraftDate: new Date()
  };

  const HOLIDAYS = {
    "2026-01-01": "신정",
    "2026-02-16": "설날 연휴",
    "2026-02-17": "설날",
    "2026-02-18": "설날 연휴",
    "2026-03-01": "삼일절",
    "2026-03-02": "삼일절 대체공휴일",
    "2026-05-05": "어린이날",
    "2026-05-25": "부처님오신날 대체공휴일",
    "2026-06-03": "전국동시지방선거",
    "2026-06-06": "현충일",
    "2026-08-15": "광복절",
    "2026-08-17": "광복절 대체공휴일",
    "2026-09-24": "추석 연휴",
    "2026-09-25": "추석",
    "2026-09-26": "추석 연휴",
    "2026-10-03": "개천절",
    "2026-10-05": "개천절 대체공휴일",
    "2026-10-09": "한글날",
    "2026-12-25": "기독탄신일",
    "2027-01-01": "신정",
    "2027-02-06": "설날 연휴",
    "2027-02-07": "설날",
    "2027-02-08": "설날 연휴",
    "2026-05-01": "노동절",
    "2026-07-17": "제헌절",
    "2027-01-01": "신정",
    "2027-02-06": "설날 연휴",
    "2027-02-07": "설날",
    "2027-02-08": "설날 연휴",
    "2027-02-09": "설날 대체공휴일",
    "2027-03-01": "삼일절",
    "2027-05-01": "노동절",
    "2027-05-03": "노동절 대체공휴일",
    "2027-05-05": "어린이날",
    "2027-05-13": "부처님오신날",
    "2027-06-06": "현충일",
    "2027-07-17": "제헌절",
    "2027-07-19": "제헌절 대체공휴일",
    "2027-08-15": "광복절",
    "2027-08-16": "광복절 대체공휴일",
    "2027-09-14": "추석 연휴",
    "2027-09-15": "추석",
    "2027-09-16": "추석 연휴",
    "2027-10-03": "개천절",
    "2027-10-04": "개천절 대체공휴일",
    "2027-10-09": "한글날",
    "2027-10-11": "한글날 대체공휴일",
    "2027-12-25": "기독탄신일",
    "2027-12-27": "기독탄신일 대체공휴일"
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

  const clampDay = (year, monthIndex, day) => Math.min(
    day,
    new Date(year, monthIndex + 1, 0).getDate()
  );

  const pad = (value) => String(value).padStart(2, "0");

  function formatDateParam(date) {
    return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("");
  }

  function schoolYear(date) {
    if (date instanceof Date) {
      const year = date.getFullYear();
      return date.getMonth() >= 2 ? year : year - 1;
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
    state.calendarDraftDate = new Date(state.date);
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

  function syncDateControl() {
    const label = els.dateControl.querySelector(".date-trigger span");
    if (label) label.textContent = formatDateLabel(state.date);
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function dateKey(date) {
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-");
  }

  function mealMaxDate(now = new Date()) {
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const releaseStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      endOfCurrentMonth.getDate() - 2
    );

    return startOfDay(now) >= releaseStart
      ? new Date(now.getFullYear(), now.getMonth() + 2, 0)
      : endOfCurrentMonth;
  }

  function isDateSelectable(date) {
    return startOfDay(date) <= startOfDay(mealMaxDate());
  }

  function canNavigateToMonth(year, monthIndex) {
    return startOfMonth(new Date(year, monthIndex, 1)) <= startOfMonth(mealMaxDate());
  }

  function getClosedReason(date) {
    const day = date.getDay();

    if (day === 0 || day === 6) {
      return { type: "weekend" };
    }

    const holidayName = HOLIDAYS[dateKey(date)];
    return holidayName
      ? { type: "holiday", name: holidayName }
      : null;
  }

  function makeDraftDate() {
    state.calendarDraftDate = new Date(
      state.date.getFullYear(),
      state.date.getMonth(),
      state.date.getDate()
    );
    state.calendarMonth = new Date(
      state.calendarDraftDate.getFullYear(),
      state.calendarDraftDate.getMonth(),
      1
    );
  }

  function shiftCalendarMonth(delta) {
    const nextMonth = new Date(
      state.calendarMonth.getFullYear(),
      state.calendarMonth.getMonth() + delta,
      1
    );

    if (!canNavigateToMonth(nextMonth.getFullYear(), nextMonth.getMonth())) {
      return false;
    }

    const nextDay = clampDay(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      state.calendarDraftDate.getDate()
    );

    state.calendarMonth = nextMonth;
    state.calendarDraftDate = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      nextDay
    );

    return true;
  }

  function calendarDaysMarkup() {
    const month = state.calendarMonth;
    const maxDate = mealMaxDate();
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startIndex = firstDay.getDay();
    const totalCells = Math.ceil((startIndex + lastDay.getDate()) / 7) * 7;
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const canNext = canNavigateToMonth(nextMonth.getFullYear(), nextMonth.getMonth());

    let cells = "";

    for (let i = 0; i < totalCells; i += 1) {
      const date = new Date(month.getFullYear(), month.getMonth(), i - startIndex + 1);
      const outside = date.getMonth() !== month.getMonth();
      const selectable = !outside && startOfDay(date) <= startOfDay(maxDate);
      const selected = isSameDate(date, state.calendarDraftDate);
      const today = isSameDate(date, new Date());
      const closed = getClosedReason(date);

      cells += `
        <button
          class="calendar-day${outside ? " is-outside" : ""}${selected && selectable ? " is-selected" : ""}${today ? " is-today" : ""}${closed ? " is-closed" : ""}${!selectable ? " is-disabled" : ""}"
          type="button"
          data-date="${formatDateParam(date)}"
          ${selectable ? "" : "disabled"}
        >${date.getDate()}</button>`;
    }

    return `
      <div class="calendar-head">
        <button type="button" class="calendar-nav" data-cal-nav="-1" aria-label="이전 달">
          <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg>
        </button>
        <div class="calendar-title" aria-label="현재 선택한 달">
          ${month.getFullYear()}년 ${month.getMonth() + 1}월
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

  function openDatePicker() {
    closeSelects();
    closeDatePicker();

    makeDraftDate();

    const picker = document.createElement("div");
    picker.className = "date-picker";
    picker.setAttribute("role", "dialog");
    picker.setAttribute("aria-label", "날짜 선택");
    state.calendarOpen = true;
    picker.addEventListener("click", (event) => {
      event.stopPropagation();

      const nav = event.target.closest("[data-cal-nav]");
      if (nav) {
        shiftCalendarMonth(Number(nav.dataset.calNav));
        renderCalendar(picker);
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
      closeDatePicker();
      syncDateControl();
      refreshData();
    });

    renderCalendar(picker);
    els.dateControl.appendChild(picker);

    els.dateControl.querySelector(".date-trigger").setAttribute("aria-expanded", "true");
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
    let options = [...initialOptions];
    let current = options.some((option) => option.value === defaultValue)
      ? defaultValue
      : (options[0]?.value || "");
    let disabled = false;

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
      trigger.disabled = disabled;
      trigger.setAttribute("aria-disabled", String(disabled));
    }

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
        root.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
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

  async function fetchClassOptions() {
    const body = await fetchJson(
      `/api/classes?date=${formatDateParam(state.date)}&grade=${encodeURIComponent(state.grade)}`
    );

    return Array.isArray(body.classes)
      ? body.classes
          .filter((value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 99)
          .map((value) => String(value))
          .filter((value, index, values) => values.indexOf(value) === index)
      : [];
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

  function extractAllergenNumbers(text) {
    const found = new Set();
    const matches = String(text).match(/\d{1,2}/g) || [];

    for (const match of matches) {
      const number = Number(match);
      if (ALLERGENS[number]) found.add(number);
    }

    return [...found].sort((a, b) => a - b);
  }

  function cleanMealLabel(text) {
    return String(text)
      .replace(/\s*\([^)]*\)\s*$/u, "")
      .replace(/\s*\[[^\]]*\]\s*$/u, "")
      .trim();
  }

  function closeAllergenModal() {
    document.querySelector(".allergen-modal")?.remove();
    document.body.classList.remove("modal-open");
  }

  function openAllergenModal(numbers, menuName = "") {
    closeAllergenModal();

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
            ${numbers.length ? numbers.map((number) => `
              <div class="allergen-row is-used">
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
  }

  function openAllergenReferenceModal(numbers = []) {
    closeAllergenModal();

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
            ${Object.entries(ALLERGENS).map(([number, name]) => `
              <div class="allergen-row${numbers.includes(Number(number)) ? " is-used" : ""}">
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

    const mealAllergenNumbers = extractAllergenNumbers(data.items.join(" "));

    els.cards.meal.innerHTML = `
      <div class="meal-content">
        <ul class="meal-list">
          ${data.items.map((item) => {
            const raw = String(item);
            const numbers = extractAllergenNumbers(raw);
            const menuName = cleanMealLabel(raw);
            const numberLabel = numbers.join(".");

            return `<li class="meal-item">
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
        const numbers = extractAllergenNumbers(button.textContent);
        const menuName = button.parentElement?.querySelector(".meal-name")?.textContent || "";
        openAllergenModal(numbers, menuName);
      });
    });

    els.cards.meal.querySelector(".allergy-button")?.addEventListener("click", () => {
      openAllergenReferenceModal(mealAllergenNumbers);
    });
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
          <article class="period-card">
            <span class="period-card-number">${escapeHtml(item.period)}교시</span>
            <strong class="period-card-subject">${escapeHtml(item.subject || "수업 정보 없음")}</strong>
          </article>`).join("")}
      </div>`;
  }
  let classSelect = null;
  let classOptionsKey = "";
  let classOptionsLoadedKey = "";
  let mealRequestId = 0;
  let timetableRequestId = 0;

  function classOptionsCacheKey(date = state.date, grade = state.grade) {
    return `${schoolYear(date)}-${grade}`;
  }

  function classOptionsFromValues(values) {
    return [...new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 99)
    )]
      .sort((a, b) => a - b)
      .map((classNumber) => ({
        value: String(classNumber),
        label: `${classNumber}반`
      }));
  }

  function readCachedClassOptions() {
    try {
      const raw = localStorage.getItem(`ygmhelper-classes-${classOptionsCacheKey()}`);
      const values = JSON.parse(raw || "null");
      return Array.isArray(values) ? values : [];
    } catch {
      return [];
    }
  }

  function applyClassOptions(values, persist = true) {
    const options = classOptionsFromValues(values);
    if (!options.length) return false;

    const previous = state.className;
    const preferred = options.some((option) => option.value === previous)
      ? previous
      : options[0].value;

    state.className = preferred;
    localStorage.setItem("ygmhelper-class", preferred);

    if (classSelect) {
      classSelect.setOptions(options, preferred);
      classSelect.setDisabled(false);
    }

    classOptionsKey = classOptionsCacheKey();
    if (persist) classOptionsLoadedKey = classOptionsKey;

    if (persist) {
      localStorage.setItem(
        `ygmhelper-classes-${classOptionsKey}`,
        JSON.stringify(options.map((option) => Number(option.value)))
      );
    }

    return preferred !== previous;
  }

  async function loadClassOptions(force = false) {
    const key = classOptionsCacheKey();

    if (!force && classOptionsLoadedKey === key) {
      return true;
    }

    const cached = readCachedClassOptions();
    if (cached.length) {
      applyClassOptions(cached, false);
    }

    try {
      const values = await fetchClassOptions();
      if (!values.length) {
        throw new Error("해당 학년의 반 정보를 찾을 수 없습니다.");
      }

      applyClassOptions(values, true);
      return true;
    } catch (error) {
      if (!cached.length) {
        classOptionsKey = "";
        classSelect?.setDisabled(false);
        setStatus("timetable", error.message || "반 정보를 불러오지 못했습니다.", "error");
      }
      return false;
    }
  }

  async function loadMeal(requestId = ++mealRequestId) {
    const closedReason = getClosedReason(state.date);

    if (closedReason) {
      if (requestId !== mealRequestId) return;
      setStatus("meal", "");
      renderClosed("meal", closedReason);
      return;
    }

    setLoading("meal");
    setStatus("meal", "");

    try {
      const data = await fetchJson(`/api/meal?date=${formatDateParam(state.date)}`);
      if (requestId !== mealRequestId) return;
      renderMeal(data);
    } catch (error) {
      if (requestId !== mealRequestId) return;
      els.cards.meal.innerHTML = `
        <div class="empty-state">
          <div>
            <h3>급식을 불러오지 못했습니다.</h3>
            <p>오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          </div>
        </div>`;
      setStatus("meal", error.message || "급식 정보를 불러오지 못했습니다.", "error");
    }
  }

  async function loadTimetable(requestId = ++timetableRequestId) {
    const closedReason = getClosedReason(state.date);

    if (closedReason) {
      if (requestId !== timetableRequestId) return;
      setStatus("timetable", "");
      renderClosed("timetable", closedReason);
      await loadClassOptions(false);
      return;
    }

    setLoading("timetable");
    setStatus("timetable", "");

    try {
      const data = await fetchJson(
        `/api/timetable?date=${formatDateParam(state.date)}&grade=${encodeURIComponent(state.grade)}&class=${encodeURIComponent(state.className)}`
      );

      if (requestId !== timetableRequestId) return;

      const previousClass = state.className;

      if (Array.isArray(data.classes) && data.classes.length) {
        applyClassOptions(data.classes, true);
      }

      if (data.invalidClass || state.className !== previousClass) {
        const retryId = ++timetableRequestId;
        await loadTimetable(retryId);
        return;
      }

      renderTimetable(data);
    } catch (error) {
      if (requestId !== timetableRequestId) return;
      els.cards.timetable.innerHTML = `
        <div class="empty-state">
          <div>
            <h3>시간표를 불러오지 못했습니다.</h3>
            <p>오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          </div>
        </div>`;
      setStatus("timetable", error.message || "시간표 정보를 불러오지 못했습니다.", "error");
    }
  }

  function refreshData() {
    loadMeal(++mealRequestId);
    loadTimetable(++timetableRequestId);
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
      if (view === "meal") loadMeal(++mealRequestId);
      else loadTimetable(++timetableRequestId);
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
        localStorage.setItem("ygmhelper-grade", value);
        classOptionsKey = "";
        classOptionsLoadedKey = "";

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

        loadTimetable(++timetableRequestId);
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
        localStorage.setItem("ygmhelper-class", value);
        loadTimetable(++timetableRequestId);
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

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAllergenModal();
    });

    let lastIsDesktop = window.innerWidth > 760;
    window.addEventListener("resize", () => {
      const isDesktop = window.innerWidth > 760;
      if (isDesktop === lastIsDesktop) return;
      lastIsDesktop = isDesktop;

      closeFloatingMenus();

      if (isDesktop) {
        loadMeal(++mealRequestId);
        loadTimetable(++timetableRequestId);
      } else {
        switchMobileView(state.mobileView);
      }
    });

    loadMeal(++mealRequestId);
    loadTimetable(++timetableRequestId);
  }

  init();
})();
