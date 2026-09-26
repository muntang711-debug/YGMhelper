# YGMhelper

시간표와 급식 정보를 한 곳에서 확인하는 웹 서비스입니다.

## 구성

- Cloudflare Workers
- Workers Static Assets
- HTML / CSS / JavaScript
- NEIS Open API
- LocalStorage 기반 사용자 설정

## 프로젝트 구조

\`\`\`
YGMhelper/
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── src/
│   ├── index.js
│   ├── api/
│   │   ├── health.js
│   │   ├── meal.js
│   │   └── timetable.js
│   └── lib/
│       └── neis.js
├── .dev.vars.example
├── .gitignore
├── README.md
└── wrangler.toml
\`\`\`

## 보안

NEIS 인증키는 브라우저 코드나 GitHub 저장소에 포함하지 않습니다.

운영 환경에서는 Cloudflare Workers의 Secret으로 다음 이름을 사용합니다.

\`NEIS_API_KEY\`

로컬 개발에서는 \`.dev.vars\`에 입력하며 이 파일은 Git에 커밋하지 않습니다.

## Worker 설정

- Worker entry: \`src/index.js\`
- Static Assets directory: \`public/\`
- API:
  - \`GET /api/health\`
  - \`GET /api/meal?date=YYYYMMDD\`
  - \`GET /api/timetable?date=YYYYMMDD&grade=1&class=1\`

## 사용자 설정

다음 값은 브라우저 LocalStorage에 저장됩니다.

- 언어: 한국어 / English
- 테마: 라이트 / 다크
- 선택 날짜
- 시간표 학년
- 시간표 반

테마를 직접 선택하기 전에는 시스템 다크/라이트 설정을 따르며, 직접 선택하면 선택값을 저장합니다.

## 배포

Cloudflare Workers에서 GitHub 저장소 \`muntang711-debug/YGMhelper\`를 연결하고 \`main\` 브랜치를 배포 대상으로 사용합니다.

운영 도메인: \`ygmhelper.xyz\`
