// =========================
// YGM헬퍼 타이머
// =========================

const minutesInput =
    document.getElementById("minutes-input");

const secondsInput =
    document.getElementById("seconds-input");

const minutesDisplay =
    document.getElementById("timer-minutes");

const secondsDisplay =
    document.getElementById("timer-seconds");

const timerCard =
    document.querySelector(".timer-card");

const startPauseButton =
    document.getElementById("start-pause-btn");

const resetButton =
    document.getElementById("reset-btn");


let totalSeconds = 300;
let initialSeconds = 300;
let timerInterval = null;
let isRunning = false;


function clampNumber(value, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return min;
    }

    return Math.min(
        Math.max(Math.floor(number), min),
        max
    );
}


function updateDisplay() {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    minutesDisplay.textContent = String(minutes).padStart(2, "0");
    secondsDisplay.textContent = String(seconds).padStart(2, "0");
}


function getInputSeconds() {
    const minutes = clampNumber(
        minutesInput.value,
        0,
        99
    );

    const seconds = clampNumber(
        secondsInput.value,
        0,
        59
    );

    minutesInput.value = String(minutes);
    secondsInput.value = String(seconds);

    return minutes * 60 + seconds;
}


function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    isRunning = false;
    startPauseButton.textContent = "시작";
}


function finishTimer() {
    stopTimer();
    totalSeconds = 0;
    updateDisplay();
    timerCard.classList.add("finished");
    startPauseButton.textContent = "다시 시작";
}


function startTimer() {
    if (totalSeconds <= 0) {
        totalSeconds = getInputSeconds();
        initialSeconds = totalSeconds;
        timerCard.classList.remove("finished");
    }

    if (totalSeconds <= 0) {
        return;
    }

    timerCard.classList.remove("finished");
    isRunning = true;
    startPauseButton.textContent = "일시정지";

    timerInterval = setInterval(() => {
        totalSeconds -= 1;
        updateDisplay();

        if (totalSeconds <= 0) {
            finishTimer();
        }
    }, 1000);
}


function resetTimer() {
    stopTimer();

    totalSeconds = getInputSeconds();
    initialSeconds = totalSeconds;

    timerCard.classList.remove("finished");
    startPauseButton.textContent = "시작";

    updateDisplay();
}


startPauseButton.addEventListener("click", () => {
    if (isRunning) {
        stopTimer();
        return;
    }

    startTimer();
});


resetButton.addEventListener("click", resetTimer);


minutesInput.addEventListener("input", () => {
    if (isRunning) {
        return;
    }

    const minutes = clampNumber(
        minutesInput.value,
        0,
        99
    );

    minutesInput.value = String(minutes);
    totalSeconds = getInputSeconds();
    initialSeconds = totalSeconds;
    timerCard.classList.remove("finished");
    updateDisplay();
});


secondsInput.addEventListener("input", () => {
    if (isRunning) {
        return;
    }

    const seconds = clampNumber(
        secondsInput.value,
        0,
        59
    );

    secondsInput.value = String(seconds);
    totalSeconds = getInputSeconds();
    initialSeconds = totalSeconds;
    timerCard.classList.remove("finished");
    updateDisplay();
});


minutesInput.addEventListener("change", () => {
    if (!isRunning) {
        resetTimer();
    }
});


secondsInput.addEventListener("change", () => {
    if (!isRunning) {
        resetTimer();
    }
});


// 초기 표시
initialSeconds = getInputSeconds();
totalSeconds = initialSeconds;
updateDisplay();