import http from 'http';
import url from 'url';

const PORT = process.env.PORT || 3001;

// 날짜별 투표 데이터 메모리 저장소
const ratingsDb = {};

const DEFAULT_RATING = {
  "GOAT야르": 0,
  "도파민극락": 0,
  "알잘딱": 0,
  "음...": 0,
  "억까임": 0
};

const server = http.createServer((req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // GET /api/ratings?date=YYYYMMDD
  if (req.method === 'GET' && pathname === '/api/ratings') {
    const date = parsedUrl.query.date;
    if (!date) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'date 파라미터가 필요합니다.' }));
      return;
    }

    if (!ratingsDb[date]) {
      ratingsDb[date] = { ...DEFAULT_RATING };
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ratingsDb[date]));
    return;
  }

  // POST /api/ratings
  if (req.method === 'POST' && pathname === '/api/ratings') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { date, rating } = JSON.parse(body || '{}');
        if (!date || !rating) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'date와 rating 데이터가 필요합니다.' }));
          return;
        }

        if (!ratingsDb[date]) {
          ratingsDb[date] = { ...DEFAULT_RATING };
        }

        if (ratingsDb[date][rating] !== undefined) {
          ratingsDb[date][rating] += 1;
        } else {
          ratingsDb[date][rating] = 1;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(ratingsDb[date]));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '잘못된 JSON 요청입니다.' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`[YGMhelper Native Server] Running on http://localhost:${PORT}`);
});