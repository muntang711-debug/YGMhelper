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

    const year =
        Number(dateString.slice(0, 4));

    const month =
        Number(dateString.slice(4, 6));

    const day =
        Number(dateString.slice(6, 8));

    return new Date(
        year,
        month - 1,
        day
    );
}


// =========================
// Date → YYYYMMDD
// =========================

function dateToString(date) {

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    const day =
        String(date.getDate()).padStart(2, "0");

    return `${year}${month}${day}`;
}


// =========================
// 날짜 표시용 문자열
// =========================

function formatDate(dateString) {

    const date =
        dateStringToDate(dateString);

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
//
// 매월 28일부터 다음 달 말일까지
// 그 전에는 현재 달 마지막 날까지
// =========================

function getMaxMealDate() {

    const today =
        dateStringToDate(getToday());

    const currentYear =
        today.getFullYear();

    const currentMonth =
        today.getMonth();

    const currentDay =
        today.getDate();


    let maxDate;


    if (currentDay >= 28) {

        // 다음 달의 마지막 날
        maxDate =
            new Date(
                currentYear,
                currentMonth + 2,
                0
            );

    } else {

        // 현재 달의 마지막 날
        maxDate =
            new Date(
                currentYear,
                currentMonth + 1,
                0
            );
    }


    return dateToString(maxDate);
}


// =========================
// 날짜 선택 가능 여부
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

    const dateElement =
        document.getElementById("today-date");


    if (!dateElement) {
        return;
    }


    const today =
        getToday();


    let text =
        formatDate(selectedMealDate);


    if (isSameDate(selectedMealDate, today)) {
        text += " · 오늘";
    }


    dateElement.textContent = text;
}


// =========================
// HTML 특수문자 처리
// =========================

function escapeHtml(text) {

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================
// 알레르기 번호 분리
// =========================

function parseMealMenu(menu) {

    const cleanedMenu =
        menu
            .replace(/&amp;/g, "&")
            .trim();


    const allergyMatch =
        cleanedMenu.match(
            /\s*\(([\d.]+)\)\s*$/
        );


    if (!allergyMatch) {

        return {
            name: cleanedMenu,
            allergy: []
        };
    }


    const allergyNumbers =
        allergyMatch[1]
            .split(".")
            .filter(number => number !== "");


    const name =
        cleanedMenu
            .replace(allergyMatch[0], "")
            .trim();


    return {
        name: name,
        allergy: allergyNumbers
    };
}


// =========================
// 날짜 드롭다운 값 설정
// =========================

function setDateSelectValues(dateString) {

    const date =
        dateStringToDate(dateString);


    const yearSelect =
        document.getElementById("date-year");

    const monthSelect =
        document.getElementById("date-month");

    const daySelect =
        document.getElementById("date-day");


    if (
        !yearSelect ||
        !monthSelect ||
        !daySelect
    ) {
        return;
    }


    yearSelect.value =
        String(date.getFullYear());

    monthSelect.value =
        String(date.getMonth() + 1);


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

    const yearSelect =
        document.getElementById("date-year");


    if (!yearSelect) {
        return;
    }


    yearSelect.innerHTML = "";


    const currentYear =
        new Date().getFullYear();


    // 2021년부터 현재 연도까지만
    for (
        let year = 2021;
        year <= currentYear;
        year++
    ) {

        const option =
            document.createElement("option");

        option.value = String(year);
        option.textContent = `${year}년`;

        yearSelect.appendChild(option);
    }
}


// =========================
// 날짜 드롭다운 월 생성
// =========================

function populateMonthOptions() {

    const monthSelect =
        document.getElementById("date-month");


    if (!monthSelect) {
        return;
    }


    monthSelect.innerHTML = "";


    for (
        let month = 1;
        month <= 12;
        month++
    ) {

        const option =
            document.createElement("option");

        option.value = String(month);
        option.textContent = `${month}월`;

        monthSelect.appendChild(option);
    }
}


// =========================
// 날짜 드롭다운 일 생성
// =========================

function updateDateDayOptions(
    year,
    month,
    selectedDay
) {

    const daySelect =
        document.getElementById("date-day");


    if (!daySelect) {
        return;
    }


    const maxDay =
        new Date(
            year,
            month,
            0
        ).getDate();


    daySelect.innerHTML = "";


    for (
        let day = 1;
        day <= maxDay;
        day++
    ) {

        const option =
            document.createElement("option");

        option.value = String(day);
        option.textContent = `${day}일`;

        daySelect.appendChild(option);
    }


    const validSelectedDay =
        Math.min(
            Number(selectedDay) || 1,
            maxDay
        );


    daySelect.value =
        String(validSelectedDay);
}


// =========================
// 날짜 드롭다운 선택 날짜
// =========================

function getDateFromSelects() {

    const yearSelect =
        document.getElementById("date-year");

    const monthSelect =
        document.getElementById("date-month");

    const daySelect =
        document.getElementById("date-day");


    if (
        !yearSelect ||
        !monthSelect ||
        !daySelect
    ) {
        return null;
    }


    const year =
        Number(yearSelect.value);

    const month =
        Number(monthSelect.value);

    const day =
        Number(daySelect.value);


    if (
        !year ||
        !month ||
        !day
    ) {
        return null;
    }


    const date =
        new Date(
            year,
            month - 1,
            day
        );


    return dateToString(date);
}


// =========================
// 날짜 팝업 버튼 상태 갱신
// =========================

function updateDateNavigationButtons(dateString) {

    const previousButton =
        document.getElementById(
            "previous-date-btn"
        );

    const nextButton =
        document.getElementById(
            "next-date-btn"
        );


    if (
        !previousButton ||
        !nextButton
    ) {
        return;
    }


    const currentDate =
        dateStringToDate(dateString);


    const previousDate =
        new Date(currentDate);

    previousDate.setDate(
        previousDate.getDate() - 1
    );


    const nextDate =
        new Date(currentDate);

    nextDate.setDate(
        nextDate.getDate() + 1
    );


    const previousDateString =
        dateToString(previousDate);

    const nextDateString =
        dateToString(nextDate);


    previousButton.disabled =
        !isValidMealDate(
            previousDateString
        );

    nextButton.disabled =
        !isValidMealDate(
            nextDateString
        );
}


// =========================
// 날짜 선택 팝업
// =========================

function setupDateModal() {

    const modal =
        document.getElementById(
            "date-modal"
        );

    const openButton =
        document.getElementById(
            "today-date"
        );

    const closeButton =
        document.getElementById(
            "date-modal-close"
        );

    const cancelButton =
        document.getElementById(
            "date-modal-cancel"
        );

    const applyButton =
        document.getElementById(
            "date-modal-apply"
        );

    const previousButton =
        document.getElementById(
            "previous-date-btn"
        );

    const todayButton =
        document.getElementById(
            "today-date-btn"
        );

    const nextButton =
        document.getElementById(
            "next-date-btn"
        );

    const yearSelect =
        document.getElementById(
            "date-year"
        );

    const monthSelect =
        document.getElementById(
            "date-month"
        );


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


    // =========================
    // 팝업 내부 임시 날짜
    // =========================

    let temporaryDate =
        selectedMealDate;


    // =========================
    // 팝업 열기
    // =========================

    function openModal() {

        temporaryDate =
            selectedMealDate;


        setDateSelectValues(
            temporaryDate
        );


        updateDateNavigationButtons(
            temporaryDate
        );


        modal.classList.add("active");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.documentElement.classList.add(
            "modal-open"
        );


        closeButton.focus();
    }


    // =========================
    // 팝업 닫기
    // =========================

    function closeModal() {

        modal.classList.remove("active");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.documentElement.classList.remove(
            "modal-open"
        );
    }


    // =========================
    // 드롭다운 날짜 변경
    // =========================

    function updateTemporaryDateFromSelects() {

        const newDate =
            getDateFromSelects();


        if (!newDate) {
            return;
        }


        if (
            !isValidMealDate(newDate)
        ) {
            return;
        }


        temporaryDate =
            newDate;


        updateDateNavigationButtons(
            temporaryDate
        );
    }


    // =========================
    // 연도 변경
    // =========================

    yearSelect.addEventListener(
        "change",
        () => {

            const currentDay =
                Number(
                    document.getElementById(
                        "date-day"
                    ).value
                ) || 1;


            updateDateDayOptions(
                Number(yearSelect.value),
                Number(monthSelect.value),
                currentDay
            );


            updateTemporaryDateFromSelects();
        }
    );


    // =========================
    // 월 변경
    // =========================

    monthSelect.addEventListener(
        "change",
        () => {

            const currentDay =
                Number(
                    document.getElementById(
                        "date-day"
                    ).value
                ) || 1;


            updateDateDayOptions(
                Number(yearSelect.value),
                Number(monthSelect.value),
                currentDay
            );


            updateTemporaryDateFromSelects();
        }
    );


    // =========================
    // 일 변경
    // =========================

    const daySelect =
        document.getElementById(
            "date-day"
        );


    if (daySelect) {

        daySelect.addEventListener(
            "change",
            () => {

                updateTemporaryDateFromSelects();

            }
        );
    }


    // =========================
    // 전날
    // =========================

    previousButton.addEventListener(
        "click",
        () => {

            const currentDate =
                dateStringToDate(
                    temporaryDate
                );


            currentDate.setDate(
                currentDate.getDate() - 1
            );


            const previousDate =
                dateToString(currentDate);


            if (
                !isValidMealDate(previousDate)
            ) {
                return;
            }


            temporaryDate =
                previousDate;


            setDateSelectValues(
                temporaryDate
            );


            updateDateNavigationButtons(
                temporaryDate
            );
        }
    );


    // =========================
    // 오늘
    // =========================

    todayButton.addEventListener(
        "click",
        () => {

            temporaryDate =
                getToday();


            setDateSelectValues(
                temporaryDate
            );


            updateDateNavigationButtons(
                temporaryDate
            );
        }
    );


    // =========================
    // 다음날
    // =========================

    nextButton.addEventListener(
        "click",
        () => {

            const currentDate =
                dateStringToDate(
                    temporaryDate
                );


            currentDate.setDate(
                currentDate.getDate() + 1
            );


            const nextDate =
                dateToString(currentDate);


            if (
                !isValidMealDate(nextDate)
            ) {
                return;
            }


            temporaryDate =
                nextDate;


            setDateSelectValues(
                temporaryDate
            );


            updateDateNavigationButtons(
                temporaryDate
            );
        }
    );


    // =========================
    // 날짜 적용
    // =========================

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


            selectedMealDate =
                newDate;


            displaySelectedDate();

            closeModal();

            loadMeal();
        }
    );


    // =========================
    // 취소
    // =========================

    cancelButton.addEventListener(
        "click",
        closeModal
    );


    // =========================
    // X 버튼
    // =========================

    closeButton.addEventListener(
        "click",
        closeModal
    );


    // =========================
    // 팝업 바깥 클릭
    // =========================

    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modal
            ) {
                closeModal();
            }

        }
    );


    // =========================
    // ESC
    // =========================

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                modal.classList.contains("active")
            ) {
                closeModal();
            }

        }
    );


    // =========================
    // 날짜 버튼 클릭
    // =========================

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
        document.getElementById(
            "reload-meal-btn"
        );


    if (!mealList) {
        return;
    }


    // =========================
    // 다시 불러오는 중 표시
    // =========================

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


        // =========================
        // API 오류 응답 확인
        // =========================

        if (data.RESULT) {

            throw new Error(
                data.RESULT.MESSAGE ||
                "NEIS API 오류"
            );
        }


        // =========================
        // 급식 데이터가 없는 경우
        // =========================

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


        // =========================
        // 선택한 날짜 급식
        // =========================

        const meal =
            mealData[0];


        const menuText =
            meal.DDISH_NM || "";


        // NEIS의 <br/> 기준으로 메뉴 분리
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


        // =========================
        // 메뉴 출력
        // =========================

        mealList.innerHTML =
            menus
                .map(menu => {

                    const parsedMenu =
                        parseMealMenu(menu);


                    const safeMenuName =
                        escapeHtml(
                            parsedMenu.name
                        );


                    // =========================
                    // 알레르기 번호가 없는 메뉴
                    // =========================

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


                    /*
                        여러 알레르기 번호를
                        하나의 버튼으로 묶는다.

                        예:
                        (5.6.9)

                        → [5.6.9]
                    */

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

                })
                .join("");


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

        // =========================
        // 다시 불러오기 버튼 복구
        // =========================

        if (reloadButton) {

            reloadButton.disabled = false;

            reloadButton.textContent =
                "🔄 급식 다시 불러오기";
        }
    }
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


    // =========================
    // 알레르기 버튼 클릭
    // =========================

    document.addEventListener(
        "click",
        (event) => {

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
                    .filter(number => number !== "");


            // 메뉴 이름
            menuName.textContent =
                mealName;


            // 알레르기 목록
            result.innerHTML =
                numbers
                    .map(number => {

                        const allergyName =
                            allergyNames[number] ||
                            "알 수 없음";


                        return `
                            <div class="meal-allergy-result-item">

                                <span class="meal-allergy-result-number">
                                    ${escapeHtml(number)}
                                </span>

                                ${escapeHtml(allergyName)}

                            </div>
                        `;

                    })
                    .join("");


            // 팝업 열기
            modal.classList.add("active");

            modal.setAttribute(
                "aria-hidden",
                "false"
            );


            document.documentElement.classList.add(
                "modal-open"
            );


            closeButton.focus();

        }
    );


    // =========================
    // 팝업 닫기
    // =========================

    function closeModal() {

        modal.classList.remove("active");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.documentElement.classList.remove(
            "modal-open"
        );
    }


    // X 버튼
    closeButton.addEventListener(
        "click",
        closeModal
    );


    // 팝업 바깥 클릭
    modal.addEventListener(
        "click",
        (event) => {

            if (event.target === modal) {
                closeModal();
            }

        }
    );


    // ESC
    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                modal.classList.contains("active")
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


    // =========================
    // 팝업 열기
    // =========================

    function openModal() {

        modal.classList.add("active");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.documentElement.classList.add(
            "modal-open"
        );

        closeButton.focus();
    }


    // =========================
    // 팝업 닫기
    // =========================

    function closeModal() {

        modal.classList.remove("active");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.documentElement.classList.remove(
            "modal-open"
        );
    }


    // 버튼으로 열기
    openButton.addEventListener(
        "click",
        openModal
    );


    // X 버튼으로 닫기
    closeButton.addEventListener(
        "click",
        closeModal
    );


    // 팝업 바깥을 눌러서 닫기
    modal.addEventListener(
        "click",
        (event) => {

            if (event.target === modal) {
                closeModal();
            }

        }
    );


    // ESC 키로 닫기
    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                modal.classList.contains("active")
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
        document.querySelectorAll(".nav a");


    if (
        !nav ||
        navLinks.length === 0
    ) {
        return;
    }


    navLinks.forEach((link) => {

        link.addEventListener(
            "click",
            (event) => {

                const targetId =
                    link.getAttribute("href");


                if (
                    !targetId ||
                    !targetId.startsWith("#")
                ) {
                    return;
                }


                const target =
                    document.querySelector(targetId);


                if (!target) {
                    return;
                }


                // 애니메이션 중이면 클릭 차단
                if (
                    nav.classList.contains("nav-locked")
                ) {
                    event.preventDefault();
                    return;
                }


                event.preventDefault();


                // 네비게이션 잠금
                nav.classList.add(
                    "nav-locked"
                );


                // 해당 카드로 부드럽게 이동
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });


                // 기존 강조 애니메이션 초기화
                target.classList.remove(
                    "nav-highlight"
                );


                // 애니메이션 재실행을 위한 강제 리플로우
                void target.offsetWidth;


                // 강조색 + 위로 2번 통통 튀기기
                target.classList.add(
                    "nav-highlight"
                );


                // CSS:
                // 0.8초 × 2회 = 총 1.6초
                setTimeout(() => {

                    target.classList.remove(
                        "nav-highlight"
                    );

                    nav.classList.remove(
                        "nav-locked"
                    );

                }, 1600);

            }
        );

    });
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