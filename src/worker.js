const SCHOOL = {
  officeCode: "B10",
  schoolCode: "7134139"
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

async function handleClasses(url, env) {
  const date = url.searchParams.get("date") || "";
  const grade = url.searchParams.get("grade") || "";

  if (!validDate(date)) {
    return json({ ok: false, error: "날짜 형식이 올바르지 않습니다." }, 400);
  }

  if (!/^[1-3]$/.test(grade)) {
    return json({ ok: false, error: "학년 값이 올바르지 않습니다." }, 400);
  }

  const payload = await neisRequest("classInfo", {
    ATPT_OFCDC_SC_CODE: SCHOOL.officeCode,
    SD_SCHUL_CODE: SCHOOL.schoolCode,
    AY: schoolYear(date),
    GRADE: grade
  }, env.NEIS_API_KEY);

  const rows = extractRows(payload, "classInfo");
  const classes = [...new Set(
    rows
      .filter((row) => String(row.GRADE || "") === grade)
      .map((row) => String(row.CLASS_NM || "").trim())
      .filter((value) => /^\d{1,2}$/.test(value))
      .map(Number)
      .filter((value) => value >= 1 && value <= 99)
  )].sort((a, b) => a - b);

  return json({
    ok: true,
    date,
    year: schoolYear(date),
    grade,
    classes,
    available: classes.length > 0
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

  if (!/^\d{1,2}$/.test(className) || Number(className) < 1 || Number(className) > 15) {
    return json({ ok: false, error: "반 값이 올바르지 않습니다." }, 400);
  }

  const payload = await neisRequest("misTimetable", {
    ATPT_OFCDC_SC_CODE: SCHOOL.officeCode,
    SD_SCHUL_CODE: SCHOOL.schoolCode,
    AY: schoolYear(date),
    SEM: semester(date),
    ALL_TI_YMD: date,
    GRADE: grade,
    CLASS_NM: className
  }, env.NEIS_API_KEY);

  const rows = extractRows(payload, "misTimetable");
  const items = rows
    .map((row) => ({
      period: row.PERIO || row.PERIOD || "",
      subject: row.ITRT_CNTNT || row.ITRT_CNTNT_NM || row.ITRT_CNTNT_NM2 || ""
    }))
    .filter((item) => item.period || item.subject);

  return json({
    ok: true,
    date,
    grade,
    class: className,
    items,
    available: items.length > 0
  }, 200, {
    "Cache-Control": "public, max-age=300"
  });
}

async function handleApi(handler, env) {
  if (!env.NEIS_API_KEY) {
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
      return handleApi(() => handleMeal(url, env), env);
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
