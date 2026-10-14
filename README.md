# YGMhelper

가볍고 빠르게 급식표와 시간표를 확인할 수 있는 웹 서비스입니다.

## 주요 기능

- 현재 주와 다음 주 범위에서 날짜 선택
- 선택한 날짜의 급식표 및 칼로리 확인
- 학년·반별 시간표 확인
- 주말과 등록된 공휴일의 급식·시간표 없음 안내
- 급식 맛 평가와 날짜별 집계
- 시스템 테마 감지 및 라이트·다크 모드
- 테마, 학년, 반 선택을 `localStorage`에 저장
- 모바일에서는 급식·시간표 전환, PC에서는 두 카드 동시 표시
- 커스텀 달력·드롭다운 및 반응형 화면

달력은 월 이동 버튼을 제공하지만 별도의 연도 선택 메뉴는 없습니다. 날짜 선택 범위는 월 단위가 아니라 현재 주의 월요일부터 다음 주의 일요일까지이며, 이 범위 밖 날짜는 선택할 수 없습니다.

## 기술 구성

- **Frontend:** HTML, CSS, JavaScript
- **Font:** Pretendard 웹폰트
- **Backend:** Cloudflare Workers
- **Static assets:** Cloudflare Workers Assets
- **Meal data:** NEIS Open API
- **Timetable data:** 컴시간 학교 시간표 서비스
- **Ratings storage:** Cloudflare D1
- **Repository and deployment:** GitHub `main` + Cloudflare Workers Builds

시간표는 컴시간에서 제공하는 현재 주·다음 주 데이터 범위에 맞춰 조회합니다. 컴시간 endpoint는 현재 HTTP 주소만 지원하므로 `http://comci.net:4082`를 사용하며, 임의로 HTTPS로 바꾸지 않습니다.

## API

| 경로 | 설명 |
|---|---|
| `GET /api/meal?date=YYYYMMDD` | 해당 날짜의 급식 및 칼로리 |
| `GET /api/classes?date=YYYYMMDD&grade=1` | 해당 학년의 반 목록 |
| `GET /api/timetable?date=YYYYMMDD&grade=1&class=1` | 해당 반 시간표 |
| `GET /api/meal-rating?date=YYYY-MM-DD&voter=...` | 급식 평가 집계와 내 평가 |
| `POST /api/meal-rating` | 급식 맛 평가 등록 또는 변경 |

시간표 API는 현재 주·다음 주 이외의 날짜에는 조회할 수 없다고 응답하며, 주말에는 시간표가 없음을 반환합니다. 클라이언트 달력도 같은 날짜 범위를 적용합니다.

## API 키 보안

NEIS 인증키는 브라우저나 Git 저장소에 넣지 않습니다. 운영 환경에서는 Cloudflare Worker Secret인 `NEIS_API_KEY`로 관리합니다.

로컬에서 급식 API를 사용하려면 저장소 루트에 `.dev.vars` 파일을 만들고 다음과 같이 설정합니다.

```dotenv
NEIS_API_KEY=실제_NEIS_인증키
```

`.dev.vars`는 Git에 커밋하지 마세요. 실제 인증키는 공유하거나 소스 코드에 직접 기록하지 않습니다.

## 로컬 실행

Node.js가 설치된 환경에서 저장소 루트에서 실행합니다.

```bash
npm install
npm run dev
```

설정과 배포 번들을 미리 점검하려면 다음 명령을 사용합니다.

```bash
npm run check
```

## 배포

Cloudflare Workers Builds가 GitHub 저장소의 `main` 브랜치를 감시하며, 변경 사항을 자동으로 배포합니다. 배포 명령은 `npm run deploy`입니다. Wrangler 배포가 실패하면 같은 명령을 한 번 더 시도해 일시적인 API 오류에서 복구할 기회를 줍니다. 반복해서 실패하면 빌드 로그를 확인해야 합니다.

수동 배포도 저장소 루트에서 실행할 수 있습니다.

```bash
npm run deploy
```

## 프로젝트 구조

```text
YGMhelper/
├─ public/
│  ├─ index.html
│  ├─ css/style.css
│  └─ js/app.js
├─ src/
│  └─ worker.js
├─ wrangler.jsonc
├─ package.json
└─ README.md
```

## 서비스 흐름

```text
브라우저
  ├─ 정적 파일 → Cloudflare Workers Assets
  └─ /api/* → Cloudflare Worker
                 ├─ 급식 → NEIS Open API
                 ├─ 시간표 → 컴시간 서비스
                 └─ 맛 평가 → Cloudflare D1
```
