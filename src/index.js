import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 날짜별 투표 데이터 메모리 저장소
const ratingsDb = {};

const DEFAULT_RATING = {
  "GOAT야르": 0,
  "도파민극락": 0,
  "알잘딱": 0,
  "음...": 0,
  "억까임": 0
};

// GET: 특정 날짜의 투표 데이터 조회
app.get('/api/ratings', (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date 파라미터가 필요합니다.' });
  }

  if (!ratingsDb[date]) {
    ratingsDb[date] = { ...DEFAULT_RATING };
  }

  return res.json(ratingsDb[date]);
});

// POST: 특정 날짜의 평가 항목 투표 처리
app.post('/api/ratings', (req, res) => {
  const { date, rating } = req.body;

  if (!date || !rating) {
    return res.status(400).json({ error: 'date와 rating 데이터가 필요합니다.' });
  }

  if (!ratingsDb[date]) {
    ratingsDb[date] = { ...DEFAULT_RATING };
  }

  if (ratingsDb[date][rating] !== undefined) {
    ratingsDb[date][rating] += 1;
  } else {
    ratingsDb[date][rating] = 1;
  }

  return res.json(ratingsDb[date]);
});

app.listen(PORT, () => {
  console.log(`[YGMhelper API Server] Running on http://localhost:${PORT}`);
});