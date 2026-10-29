# YGMhelper

용곡중학교의 급식과 시간표를 빠르게 확인하는 Cloudflare Workers 웹 서비스입니다.

## 기능과 날짜 기준

- 한국 시간(Asia/Seoul) 기준으로 현재 주 월요일부터 다음 주 일요일까지 선택합니다.
- 학년·반별 컴시간 시간표와 NEIS 점심 급식·열량·알레르기 정보를 표시합니다.
- 현재 주 시간표는 서버 캐시 없이 조회하며 화면의 중복 요청만 5초 동안 합칩니다.
- 주말은 안내 화면을 표시합니다. 공휴일을 추정한 하드코딩 목록으로 실제 등록 데이터를 숨기지 않습니다. 평일의 급식·시간표 유무는 원본 자료를 따릅니다.
- 급식 평가는 오늘 실제 급식이 있는 경우에만 등록·변경합니다. 과거·미래 날짜의 집계는 열람할 수 있습니다.
- 테마·학년·반·익명 평가 식별자는 브라우저에 저장합니다. 저장소가 차단되면 현재 세션의 메모리로 대체합니다.
- PC에서는 급식·시간표를 함께 표시하고 모바일에서는 탭으로 전환합니다. 날짜·선택 메뉴·알레르기 팝업은 키보드로 조작할 수 있습니다.

## 구성

| 영역 | 구성 |
|---|---|
| 화면 | HTML, CSS, ES modules |
| API·정적 파일 | Cloudflare Worker + Static Assets |
| 급식 | NEIS Open API, Secret `NEIS_API_KEY` |
| 시간표 | 컴시간 HTTP endpoint, 기본 TextDecoder로 EUC-KR 해독 |
| 평가 | D1 `meal_ratings`, 익명 UUID의 소문자 정규화 후 SHA-256 해시 |
| 요청 제한 | Workers Rate Limiting 바인딩, IP 120회/분 및 기기 5회/분 |
| 배포 | GitHub main → Cloudflare Workers Builds |

시간표 endpoint는 현재 `http://comci.net:4082`입니다. 검증 없이 HTTPS로 바꾸지 않습니다. 검색용 고정 학교명의 EUC-KR 바이트는 `src/worker.js`의 SCHOOL에 명시돼 있습니다. 학교를 바꿀 때 학교 코드·지역·이름·EUC-KR 검색 값도 함께 검증해야 합니다.

## 로컬 실행

Node.js **22.13 이상**이 필요하며 Node.js 24를 권장합니다.

```powershell
npm ci
npm run db:init
npm run dev
```

급식 조회를 사용하려면 루트에 `.dev.vars`를 만들고 본인의 키를 설정합니다.

```dotenv
NEIS_API_KEY=본인의_NEIS_인증키
```

`.dev.vars`는 Git에서 제외됩니다. 운영 Secret을 가져오거나 코드·로그에 넣지 마세요. 로컬 D1은 `.wrangler/state`의 별도 저장소를 사용하며 운영 DB를 공유하지 않습니다. `npm run db:init`은 로컬에서만 migration을 적용합니다.

## API

모든 날짜 파라미터·본문은 **`YYYYMMDD`** 형식입니다. 실제로 존재하는 1900~2199년 날짜만 허용합니다.

| 경로 | 메서드 | 설명 |
|---|---|---|
| `/api/meal?date=20261029` | GET, HEAD | 점심 급식·칼로리 |
| `/api/classes?date=20261029&grade=1` | GET, HEAD | 선택 학년의 반 목록 |
| `/api/timetable?date=20261029&grade=1&class=1` | GET, HEAD | 시간표·변경 표시·교실 |
| `/api/meal-rating?date=20261029` | GET, HEAD | 집계·평균·canVote |
| `/api/meal-rating` | POST | 오늘의 급식 평가 등록·변경 |

내 평가 조회는 `X-Meal-Voter: <UUID>` 요청 헤더를 사용합니다. 이전 버전의 `voter` 쿼리는 호환을 위해 읽지만 새 클라이언트에서는 쓰지 않습니다. 운영 로그의 query string은 숨깁니다.

POST는 `Content-Type: application/json`과 다음 본문을 사용합니다.

```json
{"date":"20261029","voterId":"12345678-1234-4234-8234-123456789abc","rating":4}
```

예시 날짜는 실제 호출일로 바꿔야 합니다. 평가는 정수 1~5이며 본문은 2 KiB 이하입니다. Origin이 있으면 요청 origin과 같아야 합니다. UUID의 대소문자는 같은 기기로 처리합니다.

- `400`: 잘못된 날짜·학년·반·UUID·등급·JSON.
- `403`: 다른 origin 또는 오늘이 아닌 날짜의 평가 등록.
- `404`: 없는 API 또는 정적 파일.
- `405`: 허용하지 않는 메서드. Allow 헤더 제공.
- `413`, `415`: 본문 크기 초과, JSON이 아닌 미디어 타입.
- `422`: 해당 날짜에 등록된 급식이 없음.
- `429`: 평가 요청 제한. Retry-After: 60.
- `500`, `502`, `503`, `504`: 내부·외부·설정·시간 초과 오류. 오류에 따라 requestId 제공.

조회 범위 밖·주말·시간표 미등록은 `ok: true, available: false`로 구분합니다. 모든 API 응답에는 X-Request-Id를 붙입니다.

### 익명 평가의 한계

UUID는 인증 계정이 아닙니다. 요청 제한은 대량 등록·잦은 변경을 완화하지만 저장소 초기화·다중 기기·분산 접속까지 개인 단위로 막지는 않습니다. Cloudflare의 rate limit은 위치별 비동기 카운터이므로 엄격한 전역 한도가 아닙니다. 학교 공유 IP에서 제한이 잦으면 운영 관측을 바탕으로 IP 한도를 조정해야 합니다.

기존 해시만 저장된 UUID는 원문을 복원할 수 없으므로 과거 대소문자 변형 표를 자동 병합하지 않습니다. 기존 평가 기록을 삭제하거나 재작성하지 않습니다.

## 검증과 배포

```powershell
npm test
npm run verify
npm run types
```

`verify`는 JS 문법, 날짜·인코딩·SQL·입력 제한·응답 경합·DOM 동작 회귀 검사와 Wrangler dry-run을 실행합니다. GitHub Actions와 Cloudflare 배포 명령에서도 같은 검사를 실행합니다.

```powershell
node scripts/smoke.mjs
node scripts/smoke.mjs https://ygmhelper.xyz .test-results/production.json
```

smoke는 실제 컴시간 GET을 포함하므로 자료 제공 기간과 외부 서비스 상태에 영향을 받습니다. 유효한 운영 평가를 제출하지 않으며 GET과 거부돼야 하는 POST만 검사합니다.

Cloudflare Workers Builds는 main 변경을 받아 `npm run deploy`를 실행합니다. 이 명령은 검증에 성공했을 때만 `wrangler deploy`를 실행하고 실패를 무조건 재시도하지 않습니다. 수동 배포에는 적절한 Cloudflare 인증이 필요합니다.

스키마 변경 시 migration을 먼저 검토하고 검증 DB에서 테스트합니다. 최초 baseline은 `CREATE IF NOT EXISTS`라 기존 운영 테이블을 보존합니다. 향후 migration은 별도로 운영 적용 순서를 결정해야 합니다. Worker 버전 rollback은 DB 내용을 되돌리지 않습니다.

HTTPS 강제는 Cloudflare Zone의 Always Use HTTPS에서 관리합니다. 정적 파일 `_headers`와 Worker 응답에는 CSP·nosniff·referrer·frame 제한과 1일 HSTS를 설정합니다. HSTS의 includeSubDomains/preload는 설정하지 않습니다. Worker Routes·Zone 정책·workers.dev/preview 설정은 Cloudflare에 별도로 존재합니다.

Workers Logs는 활성화하고 쿼리 문자열을 가립니다. 앱 로그에는 경로·오류 코드·상태·지연·request ID를 남기며 원문 UUID·IP·Secret·SQL 오류 내용을 기록하지 않습니다. 외부 시간표의 ‘일일 값 0’ 의미는 원본 자료 계약 확인 전 임의로 변경하지 않습니다.

## 구조

```text
public/           화면·공통 날짜/파싱 모듈·정적 헤더
src/worker.js     API·NEIS·컴시간·평가
src/http.js       크기·시간 제한과 응답 보안 정책
migrations/       버전 관리하는 D1 스키마
tests/            Node·SQLite·JSDOM 회귀 검사
scripts/smoke.mjs 로컬·운영 HTTP 확인
wrangler.jsonc    바인딩·Assets·요청 제한·로그 설정
```

실제 모바일·스크린리더·원본 서비스의 모든 변동을 자동 테스트만으로 보증할 수는 없습니다. 배포 후 정상 조회와 오류 응답·관측 로그를 확인하고, 외부 자료 계약이 바뀌면 인코딩·해독 fixture를 먼저 갱신하세요.
