export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/ratings') {
      const date = url.searchParams.get('date');

      if (request.method === 'GET') {
        if (!date) {
          return new Response(JSON.stringify({ error: 'Date is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const data = await env.MEAL_RATINGS.get(`ratings:${date}`, { type: 'json' }) || {
          "야르킁킁": 0,
          "야르": 0,
          "먹을만함": 0,
          "그저그런": 0,
          "맛없음": 0
        };

        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const { date, rating } = body;

          const validRatings = ["야르킁킁", "야르", "먹을만함", "그저그런", "맛없음"];
          if (!date || !rating || !validRatings.includes(rating)) {
            return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const currentData = await env.MEAL_RATINGS.get(`ratings:${date}`, { type: 'json' }) || {
            "야르킁킁": 0,
            "야르": 0,
            "먹을만함": 0,
            "그저그런": 0,
            "맛없음": 0
          };

          currentData[rating] = (currentData[rating] || 0) + 1;

          await env.MEAL_RATINGS.put(`ratings:${date}`, JSON.stringify(currentData));

          return new Response(JSON.stringify(currentData), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    return env.ASSETS.fetch(request);
  }
};