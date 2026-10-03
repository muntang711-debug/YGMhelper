const SCHOOL = {
  officeCode: "B10",
  schoolCode: "7134139"
};

const NEIS_BASE = "https://open.neis.go.kr/hub";

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
    .replace(/\([^)]*\)/g, (text) => text)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function neisRequest(path, params, apiKey) {
  const url = new URL(NEIS_BASE + "/" + path);
  url.searchParams.set("KEY", apiKey);
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", "1");
  url.searchParams.set("pSize", "100");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    cf: {
      cacheTtl: 300,
      cacheEverything: true
    }
  });

  if (!response.ok) throw new Error(`NEIS 응답 오류 (${response.status})`);
  return response.json();
}

function extractRows(payload, serviceKey) {
  const service = payload?.[serviceKey];
  if (!Array.isArray(service)) return [];
  const rows = service.find((part) => Array.isArray(part?.row))?.row;
  return Array.isArray(rows) ? rows : [];
}

async function handleMeal(url, env) {
  const date = url.searchParams.get("date") || "";
  if (!validDate(date)) return json({ ok: false, error: "날짜 형식이 올바르지 않습니다." }, 400);

  const payload = await neisRequest("mealServiceDietInfo", {
    ATPT_OFCDC_SC_CODE: SCHOOL.officeCode,
    SD_SCHUL_CODE: SCHOOL.schoolCode,
    MLSV_YMD: date,
    MMEAL_SC_CODE: "2"
  }, env.NEIS_API_KEY);

  const rows = extractRows(payload, "mealServiceDietInfo");
  const row = rows.find((item) => item.MMEAL_SC_CODE === "2") || rows[0];

  if (!row) return json({ ok: true, date, items: [], calories: "" }, 200, { "Cache-Control": "public, max-age=300" });

  return json({
    ok: true,
    date,
    items: cleanMealItem(row.DDISH_NM || ""),
    calories: row.CAL_INFO || ""
  }, 200, { "Cache-Control": "public, max-age=300" });
}

async function handleTimetable(url, env) {
  const date = url.searchParams.get("date") || "";
  const grade = url.searchParams.get("grade") || "";
  const className = url.searchParams.get("class") || "";

  if (!validDate(date)) return json({ ok: false, error: "날짜 형식이 올바르지 않습니다." }, 400);
  if (!/^[1-3]$/.test(grade)) return json({ ok: false, error: "학년 값이 올바르지 않습니다." }, 400);
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
      subject: row.ITRT_CNTNT || row.ITRT_CNTNT_NM || ""
    }))
    .filter((item) => item.period || item.subject);

  return json({
    ok: true,
    date,
    grade,
    class: className,
    items
  }, 200, { "Cache-Control": "public, max-age=300" });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/meal") {
      if (!env.NEIS_API_KEY) return json({ ok: false, error: "API 설정이 완료되지 않았습니다." }, 500);
      try {
        return await handleMeal(url, env);
      } catch (error) {
        console.error("meal", error);
        return json({ ok: false, error: "급식 정보를 불러오지 못했습니다." }, 502);
      }
    }

    if (url.pathname === "/api/timetable") {
      if (!env.NEIS_API_KEY) return json({ ok: false, error: "API 설정이 완료되지 않았습니다." }, 500);
      try {
        return await handleTimetable(url, env);
      } catch (error) {
        console.error("timetable", error);
        return json({ ok: false, error: "시간표 정보를 불러오지 못했습니다." }, 502);
      }
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;
    return env.ASSETS.fetch(new Request(new URL("/", request.url), request));
  }
};
