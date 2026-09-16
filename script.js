// =========================
// YGM헬퍼
// =========================


// =========================
// NEIS Open API 설정
// =========================

const NEIS_API_KEY = "0e63108664b64083ad86d34278cdcebe";
const OFFICE_CODE = "B10";
const SCHOOL_CODE = "7134139";


// =========================
// 급식 날짜 선택 범위
// =========================

const MIN_MEAL_DATE = "20210101";


// =========================
// 현재 선택된 급식 날짜
// =========================

let selectedMealDate = getToday();


// =========================
// 시간표 상태
// =========================

let timetableClassData = [];
let selectedTimetableGrade =
    localStorage.getItem("ygmhelper-timetable-grade") || "";
let selectedTimetableClass =
    localStorage.getItem("ygmhelper-timetable-class") || "";
let selectedTimetableSource =
    localStorage.getItem("ygmhelper-timetable-source") || "neis";

const COMCIGAN_PROXY_URL =
    "https://ygm-comci-proxy.muntang711.workers.dev";

const COMCIGAN_SCHOOL_NAME = "용곡중학교";

let comciganMeta = null;


// =========================
// 알레르기 번호 → 이름
// =========================

const allergyNames = {
    "1": "난류",
    "2": "우유",
    "3": "메밀",
    "4": "땅콩",
    "5": "대두",
    "6": "밀",
    "7": "고등어",
    "8": "게",
    "9": "새우",
    "10": "돼지고기",
    "11": "복숭아",
    "12": "토마토",
    "13": "아황산류",
    "14": "호두",
    "15": "닭고기",
    "16": "쇠고기",
    "17": "오징어",
    "18": "조개류",
    "19": "잣"
};


// =========================
// 오늘 날짜 구하기
// =========================

function getToday() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}${month}${day}`;
}


// =========================
// 날짜 문자열 → Date
// =========================

function dateStringToDate(dateString) {
    const year = Number(dateString.slice(0, 4));
    const month = Number(dateString.slice(4, 6));
    const day = Number(dateString.slice(6, 8));

    return new Date(year, month - 1, day);
}


// =========================
// Date → YYYYMMDD
// =========================

function dateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}${month}${day}`;
}


// =========================
// 날짜 표시용 문자열
// =========================

function formatDate(dateString) {
    const date = dateStringToDate(dateString);

    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}


// =========================
// 날짜 비교
// =========================

function isSameDate(dateA, dateB) {
    return dateA === dateB;
}


// =========================
// 날짜 선택 가능한 최대 날짜
// =========================

function getMaxMealDate() {
    const today = dateStringToDate(getToday());

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    let maxDate;

    if (currentDay >= 28) {
        maxDate = new Date(currentYear, currentMonth + 2, 0);
    } else {
        maxDate = new Date(currentYear, currentMonth + 1, 0);
    }

    return dateToString(maxDate);
}


// =========================
// 날짜 선택 가능한지 확인
// =========================

function isValidMealDate(dateString) {
    return (
        dateString >= MIN_MEAL_DATE &&
        dateString <= getMaxMealDate()
    );
}


// =========================
// 메인 화면 날짜 표시
// =========================

function displaySelectedDate() {
    const dateElement = document.getElementById("today-date");

    if (!dateElement) {
        return;
    }

    const today = getToday();

    let text = formatDate(selectedMealDate);

    if (isSameDate(selectedMealDate, today)) {
        text += " · 오늘";
    }

    dateElement.textContent = text;
}


// =========================
// HTML 특수문자 처리
// =========================

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================
// 급식 알레르기 번호 분리
// =========================

function parseMealMenu(menu) {
    const cleanedMenu = menu
        .replace(/&amp;/g, "&")
        .trim();

    const allergyMatch = cleanedMenu.match(
        /\s\(*([\d.]+)\)\s*$/
    );

    if (!allergyMatch) {
        return {
            name: cleanedMenu,
            allergy: []
        };
    }

    const allergyNumbers = allergyMatch[1]
        .split(".")
        .filter(number => number !== "");

    const name = cleanedMenu
        .replace(allergyMatch[0], "")
        .trim();

    return {
        name,
        allergy: allergyNumbers
    };
}


// =========================
// 날짜 드롭다운 값 설정
// =========================

function setDateSelectValues(dateString) {
    const date = dateStringToDate(dateString);

    const yearSelect = document.getElementById("date-year");
    const monthSelect = document.getElementById("date-month");
    const daySelect = document.getElementById("date-day");

    if (!yearSelect || !monthSelect || !daySelect) {
        return;
    }

    yearSelect.value = String(date.getFullYear());
    monthSelect.value = String(date.getMonth() + 1);

    updateDateDayOptions(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
    );
}


// =========================
// 날짜 드롭다운 연도 생성
// =========================

function populateYearOptions() {
    const yearSelect = document.getElementById("date-year");

    if (!yearSelect) {
        return;
    }

    yearSelect.innerHTML = "";

    const currentYear = new Date().getFullYear();

    for (let year = 2021; year <= currentYear; year++) {
        const option = document.createElement("option");

        option.value = String(year);
        option.textContent = `${year}년`;

        yearSelect.appendChild(option);
    }
}


// =========================
// 날짜 드롭다운 월 생성
// =========================

function populateMonthOptions() {
    const monthSelect = document.getElementById("date-month");

    if (!monthSelect) {
        return;
    }

    monthSelect.innerHTML = "";

    for (let month = 1; month <= 12; month++) {
        const option = document.createElement("option");

        option.value = String(month);
        option.textContent = `${month}월`;

        monthSelect.appendChild(option);
    }
}


// =========================
// 날짜 드롭다운 일 생성
// =========================

function updateDateDayOptions(year, month, selectedDay) {
    const daySelect = document.getElementById("date-day");

    if (!daySelect) {
        return;
    }

    const maxDay = new Date(year, month, 0).getDate();

    daySelect.innerHTML = "";

    for (let day = 1; day <= maxDay; day++) {
        const option = document.createElement("option");

        option.value = String(day);
        option.textContent = `${day}일`;

        daySelect.appendChild(option);
    }

    const validSelectedDay = Math.min(
        Number(selectedDay) || 1,
        maxDay
    );

    daySelect.value = String(validSelectedDay);
}


// =========================
// 날짜 드롭다운 선택 날짜
// =========================

function getDateFromSelects() {
    const yearSelect = document.getElementById("date-year");
    const monthSelect = document.getElementById("date-month");
    const daySelect = document.getElementById("date-day");

    if (!yearSelect || !monthSelect || !daySelect) {
        return null;
    }

    const year = Number(yearSelect.value);
    const month = Number(monthSelect.value);
    const day = Number(daySelect.value);

    if (!year || !month || !day) {
        return null;
    }

    return dateToString(
        new Date(year, month - 1, day)
    );
}


// =========================
// 날짜 팝업 버튼 상태 갱신
// =========================

function updateDateNavigationButtons(dateString) {
    const previousButton =
        document.getElementById("previous-date-btn");

    const nextButton =
        document.getElementById("next-date-btn");

    if (!previousButton || !nextButton) {
        return;
    }

    const currentDate =
        dateStringToDate(dateString);

    const previousDate =
        new Date(currentDate);

    const nextDate =
        new Date(currentDate);

    previousDate.setDate(
        previousDate.getDate() - 1
    );

    nextDate.setDate(
        nextDate.getDate() + 1
    );

    previousButton.disabled =
        !isValidMealDate(
            dateToString(previousDate)
        );

    nextButton.disabled =
        !isValidMealDate(
            dateToString(nextDate)
        );
}


// =========================
// 날짜 선택 팝업
// =========================

function setupDateModal() {
    const modal =
        document.getElementById("date-modal");

    const openButton =
        document.getElementById("today-date");

    const closeButton =
        document.getElementById("date-modal-close");

    const cancelButton =
        document.getElementById("date-modal-cancel");

    const applyButton =
        document.getElementById("date-modal-apply");

    const previousButton =
        document.getElementById("previous-date-btn");

    const todayButton =
        document.getElementById("today-date-btn");

    const nextButton =
        document.getElementById("next-date-btn");

    const yearSelect =
        document.getElementById("date-year");

    const monthSelect =
        document.getElementById("date-month");

    if (
        !modal ||
        !openButton ||
        !closeButton ||
        !cancelButton ||
        !applyButton ||
        !previousButton ||
        !todayButton ||
        !nextButton ||
        !yearSelect ||
        !monthSelect
    ) {
        return;
    }

    populateYearOptions();
    populateMonthOptions();

    let temporaryDate = selectedMealDate;

    function openModal() {
        temporaryDate = selectedMealDate;

        setDateSelectValues(temporaryDate);
        updateDateNavigationButtons(temporaryDate);

        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");

        document.documentElement.classList.add("modal-open");

        closeButton.focus();
    }

    function closeModal() {
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");

        document.documentElement.classList.remove("modal-open");
    }

    function updateTemporaryDateFromSelects() {
        const newDate = getDateFromSelects();

        if (
            !newDate ||
            !isValidMealDate(newDate)
        ) {
            return;
        }

        temporaryDate = newDate;

        updateDateNavigationButtons(
            temporaryDate
        );
    }

    yearSelect.addEventListener(
        "change",
        () => {
            const daySelect =
                document.getElementById("date-day");

            const currentDay =
                Number(daySelect?.value) || 1;

            updateDateDayOptions(
                Number(yearSelect.value),
                Number(monthSelect.value),
                currentDay
            );

            updateTemporaryDateFromSelects();
        }
    );

    monthSelect.addEventListener(
        "change",
        () => {
            const daySelect =
                document.getElementById("date-day");

            const currentDay =
                Number(daySelect?.value) || 1;

            updateDateDayOptions(
                Number(yearSelect.value),
                Number(monthSelect.value),
                currentDay
            );

            updateTemporaryDateFromSelects();
        }
    );

    const daySelect =
        document.getElementById("date-day");

    if (daySelect) {
        daySelect.addEventListener(
            "change",
            updateTemporaryDateFromSelects
        );
    }

    previousButton.addEventListener(
        "click",
        () => {
            const currentDate =
                dateStringToDate(temporaryDate);

            currentDate.setDate(
                currentDate.getDate() - 1
            );

            const previousDate =
                dateToString(currentDate);

            if (!isValidMealDate(previousDate)) {
                return;
            }

            temporaryDate = previousDate;

            setDateSelectValues(
                temporaryDate
            );

            updateDateNavigationButtons(
                temporaryDate
            );
        }
    );

    todayButton.addEventListener(
        "click",
        () => {
            temporaryDate = getToday();

            setDateSelectValues(
                temporaryDate
            );

            updateDateNavigationButtons(
                temporaryDate
            );
        }
    );

    nextButton.addEventListener(
        "click",
        () => {
            const currentDate =
                dateStringToDate(temporaryDate);

            currentDate.setDate(
                currentDate.getDate() + 1
            );

            const nextDate =
                dateToString(currentDate);

            if (!isValidMealDate(nextDate)) {
                return;
            }

            temporaryDate = nextDate;

            setDateSelectValues(
                temporaryDate
            );

            updateDateNavigationButtons(
                temporaryDate
            );
        }
    );

    applyButton.addEventListener(
        "click",
        () => {
            const newDate =
                getDateFromSelects();

            if (
                !newDate ||
                !isValidMealDate(newDate)
            ) {
                return;
            }

            selectedMealDate = newDate;

            displaySelectedDate();

            closeModal();

            loadMeal();
            loadTimetableBySource();
        }
    );

    cancelButton.addEventListener(
        "click",
        closeModal
    );

    closeButton.addEventListener(
        "click",
        closeModal
    );

    modal.addEventListener(
        "click",
        event => {
            if (event.target === modal) {
                closeModal();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                modal.classList.contains("active")
            ) {
                closeModal();
            }
        }
    );

    openButton.addEventListener(
        "click",
        openModal
    );
}


// =========================
// 급식 데이터 가져오기
// =========================

async function loadMeal() {
    const mealList =
        document.getElementById("meal-list");

    const reloadButton =
        document.getElementById("reload-meal-btn");

    if (!mealList) {
        return;
    }

    if (reloadButton) {
        reloadButton.disabled = true;
        reloadButton.textContent =
            "🔄 불러오는 중...";
    }

    mealList.innerHTML = `
        <li class="meal-loading">
            급식 정보를 불러오는 중...
        </li>
    `;

    const selectedDate =
        selectedMealDate;

    const apiUrl =
        `https://open.neis.go.kr/hub/mealServiceDietInfo` +
        `?KEY=${NEIS_API_KEY}` +
        `&Type=json` +
        `&pIndex=1` +
        `&pSize=100` +
        `&ATPT_OFCDC_SC_CODE=${OFFICE_CODE}` +
        `&SD_SCHUL_CODE=${SCHOOL_CODE}` +
        `&MLSV_YMD=${selectedDate}`;

    try {
        const response =
            await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(
                "NEIS API 요청에 실패했습니다."
            );
        }

        const data =
            await response.json();

        if (data.RESULT) {
            throw new Error(
                data.RESULT.MESSAGE ||
                "NEIS API 오류"
            );
        }

        if (
            !data.mealServiceDietInfo ||
            data.mealServiceDietInfo.length < 2
        ) {
            mealList.innerHTML = `
                <li class="meal-error">
                    선택한 날짜에는 급식 정보가 없습니다.
                </li>
            `;

            return;
        }

        const mealData =
            data.mealServiceDietInfo[1].row;

        if (
            !mealData ||
            mealData.length === 0
        ) {
            mealList.innerHTML = `
                <li class="meal-error">
                    선택한 날짜에는 급식 정보가 없습니다.
                </li>
            `;

            return;
        }

        const meal = mealData[0];

        const menuText =
            meal.DDISH_NM || "";

        const menus =
            menuText
                .split(/<br\s*\/?>/gi)
                .map(menu => menu.trim())
                .filter(menu => menu !== "");

        if (menus.length === 0) {
            mealList.innerHTML = `
                <li class="meal-error">
                    선택한 날짜의 급식 메뉴가 없습니다.
                </li>
            `;

            return;
        }

        mealList.innerHTML =
            menus.map(menu => {
                const parsedMenu =
                    parseMealMenu(menu);

                const safeMenuName =
                    escapeHtml(parsedMenu.name);

                if (
                    parsedMenu.allergy.length === 0
                ) {
                    return `
                        <li>
                            <span class="meal-name">
                                ${safeMenuName}
                            </span>
                        </li>
                    `;
                }

                const allergyText =
                    parsedMenu.allergy.join(".");

                return `
                    <li>
                        <span class="meal-name">
                            ${safeMenuName}
                        </span>

                        <span class="meal-allergy">
                            <button
                                type="button"
                                class="meal-allergy-btn"
                                data-meal-name="${safeMenuName}"
                                data-allergy-numbers="${allergyText}"
                                aria-label="${safeMenuName} 알레르기 정보 확인"
                            >
                                ${allergyText}
                            </button>
                        </span>
                    </li>
                `;
            }).join("");

    } catch (error) {
        console.error(
            "급식 정보를 불러오는 중 오류가 발생했습니다:",
            error
        );

        mealList.innerHTML = `
            <li class="meal-error">
                급식 정보를 불러오지 못했습니다.
            </li>

            <li class="meal-error">
                잠시 후 다시 확인해주세요.
            </li>
        `;

    } finally {
        if (reloadButton) {
            reloadButton.disabled = false;

            reloadButton.textContent =
                "🔄 급식 다시 불러오기";
        }
    }
}


// =========================
// 나이스 시간표 - 학급 정보
// =========================

async function loadNeisTimetableClasses() {
    const gradeSelect =
        document.getElementById("timetable-grade");

    const classSelect =
        document.getElementById("timetable-class");

    if (!gradeSelect || !classSelect) {
        return;
    }

    try {
        const year =
            String(
                dateStringToDate(
                    selectedMealDate
                ).getFullYear()
            );

        const apiUrl =
            `https://open.neis.go.kr/hub/classInfo` +
            `?KEY=${NEIS_API_KEY}` +
            `&Type=json` +
            `&pIndex=1` +
            `&pSize=100` +
            `&ATPT_OFCDC_SC_CODE=${OFFICE_CODE}` +
            `&SD_SCHUL_CODE=${SCHOOL_CODE}` +
            `&AY=${year}`;

        const response =
            await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(
                "학급 정보 요청에 실패했습니다."
            );
        }

        const data =
            await response.json();

        if (data.RESULT) {
            throw new Error(
                data.RESULT.MESSAGE ||
                "학급 정보 API 오류"
            );
        }

        timetableClassData =
            data.classInfo?.[1]?.row || [];

        if (
            timetableClassData.length === 0
        ) {
            throw new Error(
                "학급 정보가 없습니다."
            );
        }

        const grades = [
            ...new Set(
                timetableClassData
                    .map(row =>
                        String(
                            row.GRADE || ""
                        ).trim()
                    )
                    .filter(Boolean)
            )
        ].sort(
            (a, b) => Number(a) - Number(b)
        );

        if (
            !grades.includes(
                selectedTimetableGrade
            )
        ) {
            selectedTimetableGrade =
                grades[0];
        }

        gradeSelect.innerHTML =
            grades.map(grade =>
                `<option value="${escapeHtml(grade)}">${escapeHtml(grade)}학년</option>`
            ).join("");

        gradeSelect.value =
            selectedTimetableGrade;

        populateTimetableClassOptions();

        await loadNeisTimetable();

    } catch (error) {
        console.error(
            "나이스 시간표 학급 정보를 불러오는 중 오류가 발생했습니다:",
            error
        );

        gradeSelect.innerHTML = `
            <option value="">
                불러오기 실패
            </option>
        `;

        classSelect.innerHTML = `
            <option value="">
                불러오기 실패
            </option>
        `;

        const timetableList =
            document.getElementById(
                "timetable-list"
            );

        if (timetableList) {
            timetableList.innerHTML = `
                <div class="timetable-error">
                    시간표 정보를 불러오지 못했습니다.<br>
                    잠시 후 다시 확인해주세요.
                </div>
            `;
        }
    }
}


// =========================
// 시간표 반 목록 생성
// =========================

function populateTimetableClassOptions() {
    const gradeSelect =
        document.getElementById("timetable-grade");

    const classSelect =
        document.getElementById("timetable-class");

    if (!gradeSelect || !classSelect) {
        return;
    }

    const grade =
        gradeSelect.value;

    const classes = [
        ...new Set(
            timetableClassData
                .filter(
                    row =>
                        String(
                            row.GRADE || ""
                        ).trim() === grade
                )
                .map(
                    row =>
                        String(
                            row.CLASS_NM || ""
                        ).trim()
                )
                .filter(Boolean)
        )
    ].sort(
        (a, b) => Number(a) - Number(b)
    );

    if (
        !classes.includes(
            selectedTimetableClass
        )
    ) {
        selectedTimetableClass =
            classes[0] || "";
    }

    classSelect.innerHTML =
        classes.map(className =>
            `<option value="${escapeHtml(className)}">${escapeHtml(className)}반</option>`
        ).join("");

    classSelect.value =
        selectedTimetableClass;
}


// =========================
// 시간표 학기 구하기
// =========================

function getTimetableSemester(dateString) {
    const month =
        dateStringToDate(
            dateString
        ).getMonth() + 1;

    return month >= 8
        ? "2"
        : "1";
}


// =========================
// 나이스 중학교 시간표 가져오기
// =========================

async function loadNeisTimetable() {
    const timetableList =
        document.getElementById(
            "timetable-list"
        );

    const gradeSelect =
        document.getElementById(
            "timetable-grade"
        );

    const classSelect =
        document.getElementById(
            "timetable-class"
        );

    if (
        !timetableList ||
        !gradeSelect ||
        !classSelect
    ) {
        return;
    }

    const grade =
        gradeSelect.value ||
        selectedTimetableGrade;

    const className =
        classSelect.value ||
        selectedTimetableClass;

    if (!grade || !className) {
        return;
    }

    selectedTimetableGrade =
        grade;

    selectedTimetableClass =
        className;

    localStorage.setItem(
        "ygmhelper-timetable-grade",
        grade
    );

    localStorage.setItem(
        "ygmhelper-timetable-class",
        className
    );

    timetableList.innerHTML = `
        <div class="timetable-loading">
            시간표 정보를 불러오는 중...
        </div>
    `;

    const selectedDate =
        selectedMealDate;

    const year =
        selectedDate.slice(0, 4);

    const semester =
        getTimetableSemester(
            selectedDate
        );

    const apiUrl =
        `https://open.neis.go.kr/hub/misTimetable` +
        `?KEY=${NEIS_API_KEY}` +
        `&Type=json` +
        `&pIndex=1` +
        `&pSize=100` +
        `&ATPT_OFCDC_SC_CODE=${OFFICE_CODE}` +
        `&SD_SCHUL_CODE=${SCHOOL_CODE}` +
        `&AY=${year}` +
        `&SEM=${semester}` +
        `&ALL_TI_YMD=${selectedDate}` +
        `&GRADE=${encodeURIComponent(grade)}` +
        `&CLASS_NM=${encodeURIComponent(className)}`;

    try {
        const response =
            await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(
                "시간표 API 요청에 실패했습니다."
            );
        }

        const data =
            await response.json();

        if (data.RESULT) {
            throw new Error(
                data.RESULT.MESSAGE ||
                "시간표 API 오류"
            );
        }

        const timetableData =
            data.misTimetable?.[1]?.row || [];

        if (
            timetableData.length === 0
        ) {
            timetableList.innerHTML = `
                <div class="timetable-error">
                    ${escapeHtml(`${grade}학년 ${className}반`)}의<br>
                    선택한 날짜 시간표가 없습니다.
                </div>
            `;

            return;
        }

        const sortedRows =
            timetableData
                .filter(
                    row =>
                        row.PERIO &&
                        row.ITRT_CNTNT
                )
                .sort(
                    (a, b) =>
                        Number(a.PERIO) -
                        Number(b.PERIO)
                );

        if (
            sortedRows.length === 0
        ) {
            timetableList.innerHTML = `
                <div class="timetable-error">
                    선택한 날짜의 시간표가 없습니다.
                </div>
            `;

            return;
        }

        timetableList.innerHTML =
            sortedRows.map(row => `
                <div class="timetable-row">
                    <span class="timetable-period">
                        ${escapeHtml(String(row.PERIO))}교시
                    </span>

                    <span class="timetable-subject">
                        ${escapeHtml(row.ITRT_CNTNT)}
                    </span>
                </div>
            `).join("");

    } catch (error) {
        console.error(
            "나이스 시간표 정보를 불러오는 중 오류가 발생했습니다:",
            error
        );

        timetableList.innerHTML = `
            <div class="timetable-error">
                시간표 정보를 불러오지 못했습니다.<br>
                잠시 후 다시 확인해주세요.
            </div>
        `;
    }
}


// =========================
// 컴시간 EUC-KR 문자열 인코딩
// =========================

function encodeComciganSchoolName() {
    return "%bf%eb%b0%ee%c1%df%c7%d0%b1%b3";
}


// =========================
// 컴시간 응답 JSON 파싱
// =========================

function parseComciganJson(text) {
    const cleaned =
        text.replace(/\0/g, "").trim();

    const end =
        cleaned.lastIndexOf("}");

    if (end === -1) {
        throw new Error(
            "컴시간 JSON 응답을 찾지 못했습니다."
        );
    }

    return JSON.parse(
        cleaned.slice(0, end + 1)
    );
}


// =========================
// 컴시간 경로 추출
// =========================

function extractComciganMeta(html) {
    const mainRouteMatch =
        html.match(/\.\/(\d+)\?(\d+)l/);

    const timetableRouteMatch =
        html.match(/'(\d+)'_/);

    const teacherCodeMatch =
        html.match(/성명=자료\.자료(\d+)/);

    const originalCodeMatch =
        html.match(
            /원자료=Q자료\(자료\.자료(\d+)/
        );

    const dayCodeMatch =
        html.match(
            /일일자료=Q자료\(자료\.자료(\d+)/
        );

    const subjectCodeMatch =
        html.match(
            /자료\.자료(\d+)\[sb\]/
        );

    if (
        !mainRouteMatch ||
        !timetableRouteMatch
    ) {
        throw new Error(
            "컴시간 경로 정보를 찾지 못했습니다."
        );
    }

    if (
        !teacherCodeMatch ||
        !originalCodeMatch ||
        !dayCodeMatch ||
        !subjectCodeMatch
    ) {
        throw new Error(
            "컴시간 자료 코드 정보를 찾지 못했습니다."
        );
    }

    return {
        mainRoute:
            mainRouteMatch[1],

        searchRoute:
            mainRouteMatch[2],

        timetableRoute:
            timetableRouteMatch[1],

        teacherCode:
            teacherCodeMatch[1],

        originalCode:
            originalCodeMatch[1],

        dayCode:
            dayCodeMatch[1],

        subjectCode:
            subjectCodeMatch[1]
    };
}


// =========================
// 컴시간 응답 가져오기
// =========================

async function fetchComciganText(path) {
    const response =
        await fetch(
            `${COMCIGAN_PROXY_URL}${path}`,
            {
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            `컴시간 요청 실패 (${response.status})`
        );
    }

    const buffer =
        await response.arrayBuffer();

    return new TextDecoder(
        "euc-kr"
    ).decode(buffer);
}


// =========================
// 컴시간 메타데이터 초기화
// =========================

async function initializeComcigan() {
    if (comciganMeta) {
        return;
    }

    const html =
        await fetchComciganText("/");

    const meta =
        extractComciganMeta(html);

    const searchPath =
        `/${meta.mainRoute}?${meta.searchRoute}l${encodeComciganSchoolName()}`;

    const searchText =
        await fetchComciganText(
            searchPath
        );

    const searchJson =
        parseComciganJson(searchText);

    const schools =
        searchJson["학교검색"];

    if (
        !Array.isArray(schools) ||
        schools.length === 0
    ) {
        throw new Error(
            "컴시간에 용곡중학교가 등록되어 있지 않습니다."
        );
    }

    const school =
        schools.find(
            item =>
                String(
                    item?.[2] || ""
                ).trim() ===
                COMCIGAN_SCHOOL_NAME
        ) || schools[0];

    const schoolCode =
        String(
            school?.[3] || ""
        ).trim();

    if (!schoolCode) {
        throw new Error(
            "컴시간 학교 코드를 가져오지 못했습니다."
        );
    }

    const encoded =
        btoa(
            `${meta.timetableRoute}_${schoolCode}_0_1`
        );

    const timetableText =
        await fetchComciganText(
            `/${meta.mainRoute}?${encoded}`
        );

    const timetableJson =
        parseComciganJson(
            timetableText
        );

    comciganMeta = {
        ...meta,

        schoolCode,

        teacherData:
            timetableJson[
                `자료${meta.teacherCode}`
            ],

        subjectData:
            timetableJson[
                `자료${meta.subjectCode}`
            ],

        originalData:
            timetableJson[
                `자료${meta.originalCode}`
            ],

        dayData:
            timetableJson[
                `자료${meta.dayCode}`
            ],

        classCount:
            timetableJson["학급수"] || [],

        dayCount:
            timetableJson["요일별시수"] || []
    };

    if (
        !Array.isArray(
            comciganMeta.teacherData
        ) ||
        !Array.isArray(
            comciganMeta.subjectData
        ) ||
        !comciganMeta.originalData ||
        !comciganMeta.dayData
    ) {
        throw new Error(
            "컴시간 시간표 데이터 구조를 해석하지 못했습니다."
        );
    }
}


// =========================
// 컴시간 학년/반 선택지 생성
// =========================

function populateComciganClassOptions() {
    const gradeSelect =
        document.getElementById(
            "timetable-grade"
        );

    const classSelect =
        document.getElementById(
            "timetable-class"
        );

    if (
        !gradeSelect ||
        !classSelect ||
        !comciganMeta
    ) {
        return;
    }

    const counts =
        comciganMeta.classCount;

    const grades = [];

    if (Array.isArray(counts)) {
        for (
            let grade = 1;
            grade < counts.length;
            grade++
        ) {
            if (
                Number(counts[grade]) > 0
            ) {
                grades.push(
                    String(grade)
                );
            }
        }

    } else if (
        counts &&
        typeof counts === "object"
    ) {
        Object.entries(counts)
            .forEach(
                ([grade, count]) => {
                    if (
                        Number(grade) > 0 &&
                        Number(count) > 0
                    ) {
                        grades.push(
                            String(grade)
                        );
                    }
                }
            );

        grades.sort(
            (a, b) =>
                Number(a) - Number(b)
        );
    }

    if (
        !grades.includes(
            selectedTimetableGrade
        )
    ) {
        selectedTimetableGrade =
            grades[0] || "";
    }

    gradeSelect.innerHTML =
        grades.map(grade =>
            `<option value="${escapeHtml(grade)}">${escapeHtml(grade)}학년</option>`
        ).join("");

    gradeSelect.value =
        selectedTimetableGrade;

    const count =
        Array.isArray(counts)
            ? Number(
                counts[
                    Number(
                        selectedTimetableGrade
                    )
                ]
            ) || 0
            : Number(
                counts?.[
                    selectedTimetableGrade
                ]
            ) || 0;

    const classes =
        Array.from(
            { length: count },
            (_, index) =>
                String(index + 1)
        );

    if (
        !classes.includes(
            selectedTimetableClass
        )
    ) {
        selectedTimetableClass =
            classes[0] || "";
    }

    classSelect.innerHTML =
        classes.map(className =>
            `<option value="${className}">${className}반</option>`
        ).join("");

    classSelect.value =
        selectedTimetableClass;
}


// =========================
// 컴시간 교시 코드 해석
// =========================

function decodeComciganLessonCode(code) {
    const teachers =
        comciganMeta.teacherData;

    const subjects =
        comciganMeta.subjectData;

    const numericCode =
        Number(code);

    const teacherCount =
        Math.max(
            teachers.length - 1,
            1
        );

    const teacherDigits =
        String(
            teacherCount
        ).length;

    const base =
        10 ** teacherDigits;

    const teacherIndex =
        numericCode % base;

    const subjectIndex =
        Math.floor(
            numericCode /
            (base * 10)
        );

    return {
        teacher:
            String(
                teachers[
                    teacherIndex
                ] || "-"
            ).trim() || "-",

        subject:
            String(
                subjects[
                    subjectIndex
                ] || "-"
            )
            .replace(/_/g, "")
            .trim() || "-"
    };
}


// =========================
// 컴시간 특정 날짜 시간표 생성
// =========================

function getComciganLessons(
    grade,
    className,
    weekday
) {
    const original =
        comciganMeta.originalData;

    const daily =
        comciganMeta.dayData;

    const weekdayIndex =
        weekday + 1;

    const gradeOriginal =
        original?.[
            Number(grade)
        ];

    const classOriginal =
        gradeOriginal?.[
            Number(className)
        ];

    const gradeDaily =
        daily?.[
            Number(grade)
        ];

    const classDaily =
        gradeDaily?.[
            Number(className)
        ];

    const originalDay =
        classOriginal?.[
            weekdayIndex
        ];

    const dailyDay =
        classDaily?.[
            weekdayIndex
        ];

    if (
        !originalDay &&
        !dailyDay
    ) {
        return [];
    }

    const periodCount =
        Number(
            comciganMeta.dayCount?.[
                Number(grade)
            ]?.[weekdayIndex]
        ) ||

        Number(
            comciganMeta.dayCount?.[
                Number(grade)
            ]?.[weekday]
        ) ||

        Math.max(
            (originalDay?.length || 1) - 1,
            (dailyDay?.length || 1) - 1
        );

    const lessons = [];

    for (
        let period = 1;
        period <= periodCount;
        period++
    ) {
        const originalCode =
            originalDay?.[period];

        const dailyCode =
            dailyDay?.[period];

        const code =
            dailyCode ??
            originalCode;

        if (
            code === null ||
            code === undefined ||
            code === "" ||
            Number(code) === 0
        ) {
            continue;
        }

        const decoded =
            decodeComciganLessonCode(
                code
            );

        const changed =
            originalCode !== null &&
            originalCode !== undefined &&
            dailyCode !== null &&
            dailyCode !== undefined &&
            String(originalCode) !==
                String(dailyCode);

        lessons.push({
            period,
            subject:
                decoded.subject,
            teacher:
                decoded.teacher,
            changed
        });
    }

    return lessons;
}


// =========================
// 컴시간 시간표 가져오기
// =========================

async function loadComciganTimetable() {
    const timetableList =
        document.getElementById(
            "timetable-list"
        );

    const gradeSelect =
        document.getElementById(
            "timetable-grade"
        );

    const classSelect =
        document.getElementById(
            "timetable-class"
        );

    if (
        !timetableList ||
        !gradeSelect ||
        !classSelect
    ) {
        return;
    }

    timetableList.innerHTML = `
        <div class="timetable-loading">
            컴시간 시간표를 불러오는 중...
        </div>
    `;

    try {
        await initializeComcigan();

        populateComciganClassOptions();

        const grade =
            gradeSelect.value ||
            selectedTimetableGrade;

        const className =
            classSelect.value ||
            selectedTimetableClass;

        if (
            !grade ||
            !className
        ) {
            throw new Error(
                "학년 또는 반을 선택할 수 없습니다."
            );
        }

        selectedTimetableGrade =
            grade;

        selectedTimetableClass =
            className;

        localStorage.setItem(
            "ygmhelper-timetable-grade",
            grade
        );

        localStorage.setItem(
            "ygmhelper-timetable-class",
            className
        );

        const day =
            dateStringToDate(
                selectedMealDate
            ).getDay();

        if (
            day === 0 ||
            day === 6
        ) {
            timetableList.innerHTML = `
                <div class="timetable-error">
                    선택한 날짜는 주말입니다.<br>
                    평일 시간표만 표시할 수 있습니다.
                </div>
            `;

            return;
        }

        const lessons =
            getComciganLessons(
                grade,
                className,
                day - 1
            );

        if (
            lessons.length === 0
        ) {
            timetableList.innerHTML = `
                <div class="timetable-error">
                    ${escapeHtml(`${grade}학년 ${className}반`)}의<br>
                    선택한 날짜 컴시간 시간표가 없습니다.
                </div>
            `;

            return;
        }

        timetableList.innerHTML =
            lessons.map(
                lesson => `
                    <div class="timetable-row comcigan-row">

                        <span class="timetable-period">
                            ${escapeHtml(String(lesson.period))}교시
                        </span>

                        <span class="timetable-subject-area">

                            <span class="timetable-subject">
                                ${escapeHtml(lesson.subject)}
                            </span>

                            <span class="timetable-teacher">
                                ${escapeHtml(lesson.teacher)}
                            </span>

                            <span
                                class="timetable-change${lesson.changed ? " changed" : ""}"
                            >
                                ${lesson.changed ? "변경됨" : ""}
                            </span>

                        </span>

                    </div>
                `
            ).join("");

    } catch (error) {
        console.error(
            "컴시간 시간표 정보를 불러오는 중 오류가 발생했습니다:",
            error
        );

        timetableList.innerHTML = `
            <div class="timetable-error">
                컴시간 시간표를 불러오지 못했습니다.<br>
                실험적인 기능이므로 나이스 시간표를 이용해주세요.
            </div>
        `;
    }
}


// =========================
// 시간표 출처 전환
// =========================

async function loadTimetableBySource() {
    const sourceButtons =
        document.querySelectorAll(
            ".timetable-source-btn"
        );

    const sourceNote =
        document.getElementById(
            "timetable-source-note"
        );

    if (
        selectedTimetableSource !== "neis" &&
        selectedTimetableSource !== "comcigan"
    ) {
        selectedTimetableSource =
            "neis";
    }

    localStorage.setItem(
        "ygmhelper-timetable-source",
        selectedTimetableSource
    );

    sourceButtons.forEach(
        button => {
            button.classList.toggle(
                "active",
                button.dataset
                    .timetableSource ===
                    selectedTimetableSource
            );
        }
    );

    if (sourceNote) {
        sourceNote.hidden =
            selectedTimetableSource !==
            "comcigan";
    }

    if (
        selectedTimetableSource ===
        "comcigan"
    ) {
        await loadComciganTimetable();
    } else {
        await loadNeisTimetableClasses();
    }
}


// =========================
// 시간표 출처 버튼 설정
// =========================

function setupTimetableSourceButtons() {
    const sourceButtons =
        document.querySelectorAll(
            ".timetable-source-btn"
        );

    sourceButtons.forEach(
        button => {
            button.addEventListener(
                "click",
                async () => {
                    const source =
                        button.dataset
                            .timetableSource;

                    if (
                        !source ||
                        source ===
                            selectedTimetableSource
                    ) {
                        return;
                    }

                    sourceButtons.forEach(
                        item => {
                            item.disabled =
                                true;
                        }
                    );

                    try {
                        selectedTimetableSource =
                            source;

                        await loadTimetableBySource();

                    } finally {
                        sourceButtons.forEach(
                            item => {
                                item.disabled =
                                    false;
                            }
                        );
                    }
                }
            );
        }
    );
}


// =========================
// 시간표 선택 변경
// =========================

function setupTimetableControls() {
    const gradeSelect =
        document.getElementById(
            "timetable-grade"
        );

    const classSelect =
        document.getElementById(
            "timetable-class"
        );

    if (
        !gradeSelect ||
        !classSelect
    ) {
        return;
    }

    gradeSelect.addEventListener(
        "change",
        async () => {
            selectedTimetableGrade =
                gradeSelect.value;

            selectedTimetableClass =
                "";

            if (
                selectedTimetableSource ===
                "comcigan"
            ) {
                populateComciganClassOptions();

                await loadComciganTimetable();

            } else {
                populateTimetableClassOptions();

                await loadNeisTimetable();
            }
        }
    );

    classSelect.addEventListener(
        "change",
        async () => {
            selectedTimetableClass =
                classSelect.value;

            if (
                selectedTimetableSource ===
                "comcigan"
            ) {
                await loadComciganTimetable();

            } else {
                await loadNeisTimetable();
            }
        }
    );
}


// =========================
// 메뉴별 알레르기 팝업
// =========================

function setupMealAllergyModal() {
    const modal =
        document.getElementById(
            "meal-allergy-modal"
        );

    const closeButton =
        document.getElementById(
            "meal-allergy-modal-close"
        );

    const menuName =
        document.getElementById(
            "meal-allergy-menu-name"
        );

    const result =
        document.getElementById(
            "meal-allergy-result"
        );

    if (
        !modal ||
        !closeButton ||
        !menuName ||
        !result
    ) {
        return;
    }

    document.addEventListener(
        "click",
        event => {
            const button =
                event.target.closest(
                    ".meal-allergy-btn"
                );

            if (!button) {
                return;
            }

            const mealName =
                button.dataset.mealName ||
                "메뉴";

            const allergyNumbers =
                button.dataset.allergyNumbers ||
                "";

            const numbers =
                allergyNumbers
                    .split(".")
                    .filter(
                        number =>
                            number !== ""
                    );

            menuName.textContent =
                mealName;

            result.innerHTML =
                numbers.map(
                    number => {
                        const allergyName =
                            allergyNames[
                                number
                            ] ||
                            "알 수 없음";

                        return `
                            <div class="meal-allergy-result-item">

                                <span class="meal-allergy-result-number">
                                    ${escapeHtml(number)}
                                </span>

                                ${escapeHtml(
                                    allergyName
                                )}

                            </div>
                        `;
                    }
                ).join("");

            modal.classList.add(
                "active"
            );

            modal.setAttribute(
                "aria-hidden",
                "false"
            );

            document.documentElement
                .classList.add(
                    "modal-open"
                );

            closeButton.focus();
        }
    );

    function closeModal() {
        modal.classList.remove(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.documentElement
            .classList.remove(
                "modal-open"
            );
    }

    closeButton.addEventListener(
        "click",
        closeModal
    );

    modal.addEventListener(
        "click",
        event => {
            if (
                event.target === modal
            ) {
                closeModal();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                modal.classList.contains(
                    "active"
                )
            ) {
                closeModal();
            }
        }
    );
}


// =========================
// 전체 알레르기 번호 안내 팝업
// =========================

function setupAllergyModal() {
    const modal =
        document.getElementById(
            "allergy-modal"
        );

    const openButton =
        document.getElementById(
            "allergy-info-btn"
        );

    const closeButton =
        document.getElementById(
            "allergy-modal-close"
        );

    if (
        !modal ||
        !openButton ||
        !closeButton
    ) {
        return;
    }

    function openModal() {
        modal.classList.add(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.documentElement
            .classList.add(
                "modal-open"
            );

        closeButton.focus();
    }

    function closeModal() {
        modal.classList.remove(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.documentElement
            .classList.remove(
                "modal-open"
            );
    }

    openButton.addEventListener(
        "click",
        openModal
    );

    closeButton.addEventListener(
        "click",
        closeModal
    );

    modal.addEventListener(
        "click",
        event => {
            if (
                event.target === modal
            ) {
                closeModal();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                modal.classList.contains(
                    "active"
                )
            ) {
                closeModal();
            }
        }
    );
}


// =========================
// 급식 다시 불러오기 버튼
// =========================

function setupReloadButton() {
    const reloadButton =
        document.getElementById(
            "reload-meal-btn"
        );

    if (!reloadButton) {
        return;
    }

    reloadButton.addEventListener(
        "click",
        () => {
            loadMeal();
        }
    );
}


// =========================
// 상단 네비게이션 카드 이동 애니메이션
// =========================

function setupNavigationHighlight() {
    const nav =
        document.querySelector(".nav");

    const navLinks =
        document.querySelectorAll(
            ".nav a"
        );

    if (
        !nav ||
        navLinks.length === 0
    ) {
        return;
    }

    navLinks.forEach(
        link => {
            link.addEventListener(
                "click",
                event => {
                    const targetId =
                        link.getAttribute(
                            "href"
                        );

                    if (
                        !targetId ||
                        !targetId.startsWith(
                            "#"
                        )
                    ) {
                        return;
                    }

                    const target =
                        document.querySelector(
                            targetId
                        );

                    if (!target) {
                        return;
                    }

                    if (
                        nav.classList.contains(
                            "nav-locked"
                        )
                    ) {
                        event.preventDefault();
                        return;
                    }

                    event.preventDefault();

                    nav.classList.add(
                        "nav-locked"
                    );

                    target.scrollIntoView({
                        behavior:
                            "smooth",
                        block:
                            "start"
                    });

                    target.classList.remove(
                        "nav-highlight"
                    );

                    void target.offsetWidth;

                    target.classList.add(
                        "nav-highlight"
                    );

                    setTimeout(
                        () => {
                            target.classList.remove(
                                "nav-highlight"
                            );

                            nav.classList.remove(
                                "nav-locked"
                            );
                        },
                        1600
                    );
                }
            );
        }
    );
}


// =========================
// 라이트 / 다크모드
// =========================

function setupThemeToggle() {
    const nav =
        document.querySelector(".nav");

    if (!nav) {
        return;
    }

    const themeButton =
        document.createElement(
            "button"
        );

    themeButton.type =
        "button";

    themeButton.className =
        "theme-toggle";

    const savedTheme =
        localStorage.getItem(
            "ygmhelper-theme"
        );

    if (
        savedTheme === "dark" ||
        savedTheme === "light"
    ) {
        document.documentElement
            .classList.toggle(
                "dark-mode",
                savedTheme === "dark"
            );

    } else {
        const prefersDark =
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;

        document.documentElement
            .classList.toggle(
                "dark-mode",
                prefersDark
            );
    }

    function updateThemeButton() {
        const isDark =
            document.documentElement
                .classList.contains(
                    "dark-mode"
                );

        if (isDark) {
            themeButton.textContent =
                "☀️";

            themeButton.setAttribute(
                "aria-label",
                "라이트모드로 전환"
            );

            themeButton.setAttribute(
                "title",
                "라이트모드"
            );

        } else {
            themeButton.textContent =
                "🌙";

            themeButton.setAttribute(
                "aria-label",
                "다크모드로 전환"
            );

            themeButton.setAttribute(
                "title",
                "다크모드"
            );
        }
    }

    updateThemeButton();

    nav.appendChild(
        themeButton
    );

    themeButton.addEventListener(
        "click",
        () => {
            const isDark =
                document.documentElement
                    .classList.toggle(
                        "dark-mode"
                    );

            localStorage.setItem(
                "ygmhelper-theme",
                isDark
                    ? "dark"
                    : "light"
            );

            updateThemeButton();
        }
    );
}


// =========================
// YGM헬퍼 시작
// =========================

displaySelectedDate();

loadMeal();

setupDateModal();

setupReloadButton();

setupAllergyModal();

setupMealAllergyModal();

setupNavigationHighlight();

setupThemeToggle();

setupTimetableSourceButtons();

setupTimetableControls();

loadTimetableBySource();