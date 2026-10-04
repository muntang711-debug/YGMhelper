import iconv from "iconv-lite";

const SCHOOL = {
  officeCode: "B10",
  schoolCode: "7134139",
  name: "용곡중학교",
  region: "서울"
};

const NEIS_BASE = "https://open.neis.go.kr/hub";

class NeisError extends Error {
  constructor(message, code = "UPSTREAM_ERROR", status = 502) {
    super(message);
    this.name = "NeisError";
    this.code = code;
    this.status = status;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function validDate(value) {
  return /^\d{8}$/.test(value);
}

function schoolYear(date) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(4, 6));
  return month >= 3 ? year : year - 1;
}

function semester(date) {
  const month = Number(date.slice(4, 6));
  return month >= 3 && month <= 8 ? "1" : "2";
}

function cleanMealItem(value) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readNeisResult(payload, serviceKey) {
  if (payload?.RESULT?.CODE) {
    return payload.RESULT;
  }

  const service = payload?.[serviceKey];

  if (!Array.isArray(service)) {
    const keys = payload && typeof payload === "object" ? Object.keys(payload) : [];
    throw new NeisError(
      keys.length
        ? `NEIS 응답 형식을 확인할 수 없습니다. (${keys.join(", ")})`
        : "NEIS에서 예상하지 못한 응답을 반환했습니다.",
      "INVALID_RESPONSE",
      502
    );
  }

  for (const part of service) {
    const head = part?.head;
    if (!Array.isArray(head)) continue;

    const resultPart = head.find((item) => item?.RESULT);
    const result = resultPart?.RESULT;

    if (result?.CODE) {
      return result;
    }
  }

  return null;
}

async function neisRequest(path, params, apiKey) {
  if (!apiKey) {
    throw new NeisError("NEIS 인증키가 설정되지 않았습니다.", "INVALID_KEY", 500);
  }

  const url = new URL(NEIS_BASE + "/" + path);
  url.searchParams.set("KEY", apiKey);
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", "1");
  url.searchParams.set("pSize", "100");

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let response;
  try {
    response = await fetch(url.toString(), {
      cf: {
        cacheTtl: 300,
        cacheEverything: true
      }
    });
  } catch (error) {
    throw new NeisError("NEIS 서버에 연결하지 못했습니다.", "NETWORK_ERROR", 502);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new NeisError(
      `NEIS 서버 응답 오류 (${response.status})`,
      "HTTP_ERROR",
      502
    );
  }

  const result = readNeisResult(payload, path);

  if (result?.CODE === "ERROR-290") {
    throw new NeisError("NEIS 인증키가 유효하지 않습니다.", "INVALID_KEY", 502);
  }

  if (result?.CODE === "ERROR-300") {
    throw new NeisError("NEIS 요청값이 누락되었습니다.", "BAD_REQUEST", 400);
  }

  if (result?.CODE === "ERROR-337") {
    throw new NeisError("NEIS 일일 호출 한도를 초과했습니다.", "RATE_LIMIT", 429);
  }

  if (result?.CODE && result.CODE.startsWith("ERROR-")) {
    throw new NeisError(
      result.MESSAGE || "NEIS에서 요청을 처리하지 못했습니다.",
      result.CODE,
      502
    );
  }

  return payload;
}

function extractRows(payload, serviceKey) {
  const service = payload?.[serviceKey];
  if (!Array.isArray(service)) return [];

  for (const part of service) {
    if (Array.isArray(part?.row)) return part.row;
  }

  return [];
}

const COMCIGAN_URL = "http://comci.net:4082";
const COMCIGAN_CACHE_TTL = 30;

let comciganCodeCache = null;
let comciganCodeCacheExpiresAt = 0;
let comciganSchoolCache = null;
let comciganSchoolCacheExpiresAt = 0;
const comciganWeekCache = new Map();

async function fetchComciganText(url, { eucKr = false, cacheTtl = COMCIGAN_CACHE_TTL } = {}) {
  let response;

  try {
    response = await fetch(url, {
      headers: {
        "Accept": "*/*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Referer": `${COMCIGAN_URL}/st`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest"
      },
      signal: AbortSignal.timeout(10000),
      cf: {
        cacheTtl,
        cacheEverything: true
      }
    });
  } catch (error) {
    throw new Error("컴시간 서버에 연결하지 못했습니다.");
  }

  if (!response.ok) {
    throw new Error(`컴시간 서버 응답 오류 (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return eucKr ? iconv.decode(buffer, "euc-kr") : buffer.toString("utf-8");
}

function encodeEucKr(value) {
  const bytes = iconv.encode(value, "euc-kr");

  return Array.from(bytes, (byte) =>
    `%${byte.toString(16).toUpperCase().padStart(2, "0")}`
  ).join("");
}

async function getComciganCodes() {
  if (comciganCodeCache && comciganCodeCacheExpiresAt > Date.now()) {
    return comciganCodeCache;
  }

  const html = await fetchComciganText(`${COMCIGAN_URL}/st`, {
    eucKr: true,
    cacheTtl: 300
  });

  const routeMatch = html.match(/\.\/(\d+)\?(\d+)l/);
  const code0 = html.match(/sc_data\('([0-9]+)_/)?.[1];
  const teacherCode = html.match(/Q성명\(자료\.자료(\d+)/)?.[1];
  const subjectCode = html.match(/자료\.자료(\d+)\[sb\]/)?.[1];
  const updateCode = html.match(/=H시간표\.자료(\d+)/)?.[1];
  const changedCode = html.match(/일일자료=Q자료\(자료\.자료(\d+)/)?.[1];
  const originalCode = html.match(/원자료=Q자료\(자료\.자료(\d+)/)?.[1];

  if (!routeMatch || !code0 || !teacherCode || !subjectCode || !updateCode || !changedCode || !originalCode) {
    throw new Error("컴시간 데이터 형식을 확인하지 못했습니다.");
  }

  comciganCodeCache = {
    endpoint: routeMatch[1],
    searchPrefix: routeMatch[2],
    code0,
    teacherCode,
    subjectCode,
    updateCode,
    changedCode,
    originalCode
  };
  comciganCodeCacheExpiresAt = Date.now() + 5 * 60 * 1000;

  return comciganCodeCache;
}

async function resolveComciganSchool(codes) {
  if (comciganSchoolCache && comciganSchoolCacheExpiresAt > Date.now()) {
    return comciganSchoolCache;
  }

  const encodedName = encodeEucKr(SCHOOL.name);
  const responseText = await fetchComciganText(
    `${COMCIGAN_URL}/${codes.endpoint}?${codes.searchPrefix}l${encodedName}`,
    { cacheTtl: 3600 }
  );

  const cleaned = responseText.replace(/\0/g, "").trim();

  let payload;
  try {
    payload = JSON.parse(cleaned);
  } catch (error) {
    throw new Error("컴시간 학교 검색 응답을 해석하지 못했습니다.");
  }

  const schools = Array.isArray(payload?.학교검색) ? payload.학교검색 : [];
  const exactMatches = schools.filter(
    (school) => school?.[1] === SCHOOL.region && school?.[2] === SCHOOL.name
  );

  const match = exactMatches[0] || schools.find(
    (school) => school?.[2] === SCHOOL.name
  );

  if (!match || !match[3]) {
    throw new Error("컴시간에 용곡중학교 시간표가 등록되어 있지 않거나 학교를 찾지 못했습니다.");
  }

  comciganSchoolCache = {
    localCode: Number(match[0]) || 0,
    region: String(match[1] || ""),
    name: String(match[2] || SCHOOL.name),
    code: Number(match[3])
  };
  comciganSchoolCacheExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

  return comciganSchoolCache;
}

function dateParts(date) {
  const value = String(date);
  return {
    year: Number(value.slice(0, 4)),
    month: Number(value.slice(4, 6)),
    day: Number(value.slice(6, 8))
  };
}

function utcDayValue(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function currentKstParts() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day)
  };
}

function weekdayOf(parts) {
  return new Date(utcDayValue(parts)).getUTCDay();
}

function comciganWeekForDate(date) {
  const target = dateParts(date);
  const today = currentKstParts();
  const todayWeekday = weekdayOf(today);
  const monday = {
    year: today.year,
    month: today.month,
    day: today.day
  };
  const mondayValue = utcDayValue(monday) - (todayWeekday === 0 ? 6 : todayWeekday - 1) * 86400000;
  const diffDays = Math.round((utcDayValue(target) - mondayValue) / 86400000);

  if (diffDays < 0 || diffDays > 13) return null;
  return diffDays >= 7 ? 1 : 0;
}

function getComciganDayIndex(date) {
  const weekday = weekdayOf(dateParts(date));
  return weekday >= 1 && weekday <= 5 ? weekday : null;
}

function cleanComciganJson(rawText) {
  const line = rawText
    .replace(/\0/g, "")
    .split("\\n")[0]
    .trim();

  const end = line.lastIndexOf("}");
  return end >= 0 ? line.slice(0, end + 1) : line;
}

function asPositiveNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function decodeComciganLesson(value, subjects, teachers) {
  const raw = String(value ?? "0");
  const changed = raw.startsWith(">");
  const numeric = Number(changed ? raw.slice(1) : raw);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return {
      subject: "",
      teacher: "",
      changed,
      raw: value
    };
  }

  const subjectIndex = Math.floor(numeric / 1000);
  const teacherIndex = numeric % 1000;

  return {
    subject: subjects[subjectIndex] || "",
    teacher: teachers[teacherIndex] || "",
    changed,
    raw: value
  };
}

function decodeComciganLocation(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "0") return "";

  const separator = raw.indexOf("_");
  const location = separator >= 0 ? raw.slice(separator + 1).trim() : raw;

  return location.replace(/^\d+$/, "").trim();
}

async function fetchComciganWeek(weekNum) {
  const cached = comciganWeekCache.get(weekNum);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const codes = await getComciganCodes();
  const school = await resolveComciganSchool(codes);

  const payload = `${codes.code0}_${school.code}_0_${weekNum + 1}`;
  const encoded = btoa(payload);
  const upstream = await fetchComciganText(
    `${COMCIGAN_URL}/${codes.endpoint}?${encoded}`,
    { cacheTtl: COMCIGAN_CACHE_TTL }
  );

  let response;
  try {
    response = JSON.parse(cleanComciganJson(upstream));
  } catch (error) {
    throw new Error("컴시간 시간표 응답을 해석하지 못했습니다.");
  }

  const teachers = Array.isArray(response[`자료${codes.teacherCode}`])
    ? [...response[`자료${codes.teacherCode}`]]
    : [];
  const subjects = Array.isArray(response[`자료${codes.subjectCode}`])
    ? [...response[`자료${codes.subjectCode}`]]
    : [];
  const dailyTimetable = response[`자료${codes.changedCode}`];
  const originalTimetable = response[`자료${codes.originalCode}`];
  const locationMatrix = response.자료245;

  if (!Array.isArray(teachers) || !Array.isArray(subjects) || !Array.isArray(dailyTimetable) || !Array.isArray(originalTimetable)) {
    throw new Error("컴시간 시간표 데이터가 예상한 형식이 아닙니다.");
  }

  const value = {
    school,
    response,
    teachers,
    subjects,
    dailyTimetable,
    originalTimetable,
    locationMatrix,
    codes
  };

  comciganWeekCache.set(weekNum, {
    value,
    expiresAt: Date.now() + COMCIGAN_CACHE_TTL * 1000
  });

  return value;
}

function classNumbersFromComcigan(data, grade) {
  const gradeNumber = Number(grade);
  let count = asPositiveNumber(data.response?.학급수?.[gradeNumber]);
  const virtualCount = asPositiveNumber(data.response?.가상학급수?.[gradeNumber]);

  if (count > 0) {
    count = Math.max(0, count - virtualCount);
    return Array.from({ length: count }, (_, index) => index + 1);
  }

  const gradeData = data.dailyTimetable?.[gradeNumber] || data.originalTimetable?.[gradeNumber];
  if (!Array.isArray(gradeData)) return [];

  return Array.from({ length: Math.max(0, gradeData.length - 1) }, (_, index) => index + 1);
}

async function handleClasses(url, env) {
  const date = url.searchParams.get("date") || "";
  const grade = url.searchParams.get("grade") || "";

  if (!validDate(date)) {
    return json({ ok: false, error: "날짜 형식이 올바르지 않습니다." }, 400);
  }

  if (!/^[1-3]$/.test(grade)) {
    return json({ ok: false, error: "학년 값이 올바르지 않습니다." }, 400);
  }

  const requestedWeek = comciganWeekForDate(date);
  const weekNum = requestedWeek === null ? 0 : requestedWeek;
  const data = await fetchComciganWeek(weekNum);
  const classes = classNumbersFromComcigan(data, grade);

  return json({
    ok: true,
    date,
    grade,
    classes,
    source: "comcigan",
    available: classes.length > 0,
    week: weekNum
  }, 200, {
    "Cache-Control": "public, max-age=300"
  });
}

async function handleTimetable(url, env) {
  const date = url.searchParams.get("date") || "";
  const grade = url.searchParams.get("grade") || "";
  const className = url.searchParams.get("class") || "";

  if (!validDate(date)) {
    return json({ ok: false, error: "날짜 형식이 올바르지 않습니다." }, 400);
  }

  if (!/^[1-3]$/.test(grade)) {
    return json({ ok: false, error: "학년 값이 올바르지 않습니다." }, 400);
  }

  if (!/^\d{1,2}$/.test(className) || Number(className) < 1 || Number(className) > 99) {
    return json({ ok: false, error: "반 값이 올바르지 않습니다." }, 400);
  }

  const weekNum = comciganWeekForDate(date);
  if (weekNum === null || getComciganDayIndex(date) === null) {
    return json({
      ok: true,
      date,
      grade,
      class: className,
      classes: [],
      items: [],
      source: "comcigan",
      available: false,
      message: "컴시간에서는 현재 주와 다음 주 시간표만 조회할 수 있습니다."
    });
  }

  const data = await fetchComciganWeek(weekNum);
  const classes = classNumbersFromComcigan(data, grade);
  const dayIndex = getComciganDayIndex(date);
  const gradeNumber = Number(grade);
  const classNumber = Number(className);

  if (!classes.includes(classNumber)) {
    return json({
      ok: true,
      date,
      grade,
      class: className,
      school: data.school.name,
      classes,
      items: [],
      source: "comcigan",
      available: false,
      invalidClass: true,
      message: "선택한 반의 시간표가 없습니다.",
      updatedAt: data.response[`자료${data.codes.updateCode}`] || ""
    }, 200, {
      "Cache-Control": "no-store"
    });
  }

  const dayData = data.dailyTimetable?.[gradeNumber]?.[classNumber]?.[dayIndex];
  const originalDayData = data.originalTimetable?.[gradeNumber]?.[classNumber]?.[dayIndex];

  const maxPeriod = Math.max(
    asPositiveNumber(originalDayData?.[0]),
    asPositiveNumber(dayData?.[0]),
    0
  );

  const items = [];

  for (let period = 1; period <= maxPeriod; period += 1) {
    const originalValue = originalDayData?.[period] ?? 0;
    const dailyValue = dayData?.[period] ?? originalValue;
    const lesson = decodeComciganLesson(dailyValue, data.subjects, data.teachers);
    const originalLesson = decodeComciganLesson(originalValue, data.subjects, data.teachers);

    if (!lesson.subject && !originalLesson.subject) continue;

    const locationValue = data.locationMatrix?.[gradeNumber]?.[classNumber]?.[dayIndex]?.[period];
    const location = decodeComciganLocation(locationValue);

    items.push({
      period,
      subject: lesson.subject || originalLesson.subject || "",
      teacher: lesson.teacher || originalLesson.teacher || "",
      location,
      changed: Boolean(lesson.changed || dailyValue !== originalValue),
      originalSubject: originalLesson.subject || ""
    });
  }

  return json({
    ok: true,
    date,
    grade,
    class: className,
    school: data.school.name,
    classes,
    items,
    source: "comcigan",
    available: items.length > 0,
    updatedAt: data.response[`자료${data.codes.updateCode}`] || ""
  }, 200, {
    "Cache-Control": "no-store"
  });
}

async function handleMeal(url, env) {
  const date = url.searchParams.get("date") || "";

  if (!validDate(date)) {
    return json({ ok: false, error: "날짜 형식이 올바르지 않습니다." }, 400);
  }

  const payload = await neisRequest("mealServiceDietInfo", {
    ATPT_OFCDC_SC_CODE: SCHOOL.officeCode,
    SD_SCHUL_CODE: SCHOOL.schoolCode,
    MLSV_YMD: date,
    MMEAL_SC_CODE: "2"
  }, env.NEIS_API_KEY);

  const rows = extractRows(payload, "mealServiceDietInfo");
  const row = rows.find((item) => item.MMEAL_SC_CODE === "2") || rows[0];

  if (!row) {
    return json({
      ok: true,
      date,
      items: [],
      calories: "",
      available: false
    }, 200, {
      "Cache-Control": "public, max-age=300"
    });
  }

  return json({
    ok: true,
    date,
    items: cleanMealItem(row.DDISH_NM || ""),
    calories: row.CAL_INFO || "",
    available: true
  }, 200, {
    "Cache-Control": "public, max-age=300"
  });
}

async function handleApi(handler, env, { requireNeisKey = false } = {}) {
  if (requireNeisKey && !env.NEIS_API_KEY) {
    return json({
      ok: false,
      error: "NEIS API Secret이 설정되지 않았습니다."
    }, 500);
  }

  try {
    return await handler();
  } catch (error) {
    console.error("neis", {
      name: error?.name,
      code: error?.code,
      message: error?.message
    });

    const status = Number.isInteger(error?.status) ? error.status : 502;
    const message = error?.message || "NEIS 정보를 불러오지 못했습니다.";

    return json({
      ok: false,
      error: message
    }, status);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/meal") {
      return handleApi(() => handleMeal(url, env), env, { requireNeisKey: true });
    }

    if (url.pathname === "/api/timetable") {
      return handleApi(() => handleTimetable(url, env), env);
    }

    if (url.pathname === "/api/classes") {
      return handleApi(() => handleClasses(url, env), env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;

    return env.ASSETS.fetch(new Request(new URL("/", request.url), request));
  }
};
