const RATING_MAP = {
  // 표준 정규화 레이블
  "최고예요": "최고예요",
  "맛있어요": "맛있어요",
  "보통이에요": "보통이에요",
  "조금 아쉬워요": "조금 아쉬워요",
  "별로예요": "별로예요",

  // 과거 레거시 키 호환 매핑
  "GOAT야르": "최고예요",
  "야르킁킁": "최고예요",
  "goat야르": "최고예요",
  "고트야르": "최고예요",
  "opt1": "최고예요",

  "도파민극락": "맛있어요",
  "야르": "맛있어요",
  "도파민": "맛있어요",
  "극락": "맛있어요",
  "opt2": "맛있어요",

  "알잘딱": "보통이에요",
  "알잘딱깔센": "보통이에요",
  "먹을만함": "보통이에요",
  "opt3": "보통이에요",

  "음...": "조금 아쉬워요",
  "음": "조금 아쉬워요",
  "그저그런": "조금 아쉬워요",
  "opt4": "조금 아쉬워요",

  "억까임": "별로예요",
  "억까": "별로예요",
  "맛없음": "별로예요",
  "opt5": "별로예요"
};

function getDefaultRatings() {
  return {
    "최고예요": 0,
    "맛있어요": 0,
    "보통이에요": 0,
    "조금 아쉬워요": 0,
    "별로예요": 0
  };
}

function normalizeRatings(raw) {
  const result = getDefaultRatings();
  if (!raw || typeof raw !== 'object') return result;

  for (const [key, val] of Object.entries(raw)) {
    const count = Number(val) || 0;
    const targetKey = RATING_MAP[key];
    if (targetKey) {
      result[targetKey] += count;
    } else if (result[key] !== undefined) {
      result[key] += count;
    }
  }
  return result;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/ratings') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }

      const date = url.searchParams.get('date');

      if (request.method === 'GET') {
        if (!date) {
          return new Response(JSON.stringify({ error: 'Date is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const rawData = await env.MEAL_RATINGS.get(`ratings:${date}`, { type: 'json' });
        const data = normalizeRatings(rawData);

        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const { date, rating } = body;

          const normalizedRating = RATING_MAP[rating];
          if (!date || !normalizedRating) {
            return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }

          const rawData = await env.MEAL_RATINGS.get(`ratings:${date}`, { type: 'json' });
          const currentData = normalizeRatings(rawData);

          currentData[normalizedRating] = (currentData[normalizedRating] || 0) + 1;

          // 7일(604,800초) 후 자동 삭제 TTL
          await env.MEAL_RATINGS.put(`ratings:${date}`, JSON.stringify(currentData), {
            expirationTtl: 604800
          });

          return new Response(JSON.stringify(currentData), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
      }
    }

    return env.ASSETS.fetch(request);
  }
};