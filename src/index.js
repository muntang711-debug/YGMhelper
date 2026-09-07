// Cloudflare Workers 표준 ES Module 핸들러
const ratingsDb = {};

const DEFAULT_RATING = {
  "GOAT야르": 0,
  "도파민극락": 0,
  "알잘딱": 0,
  "음...": 0,
  "억까임": 0
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS Preflight 처리
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // GET /api/ratings?date=YYYYMMDD
    if (request.method === 'GET' && pathname === '/api/ratings') {
      const date = url.searchParams.get('date');
      if (!date) {
        return new Response(JSON.stringify({ error: 'date 파라미터가 필요합니다.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      if (!ratingsDb[date]) {
        ratingsDb[date] = { ...DEFAULT_RATING };
      }

      return new Response(JSON.stringify(ratingsDb[date]), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // POST /api/ratings
    if (request.method === 'POST' && pathname === '/api/ratings') {
      try {
        const body = await request.json();
        const { date, rating } = body || {};

        if (!date || !rating) {
          return new Response(JSON.stringify({ error: 'date와 rating 데이터가 필요합니다.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        if (!ratingsDb[date]) {
          ratingsDb[date] = { ...DEFAULT_RATING };
        }

        if (ratingsDb[date][rating] !== undefined) {
          ratingsDb[date][rating] += 1;
        } else {
          ratingsDb[date][rating] = 1;
        }

        return new Response(JSON.stringify(ratingsDb[date]), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: '잘못된 JSON 요청입니다.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};