# YGMhelper

가볍고 빠르게 사용할 수 있는 급식표 · 시간표 서비스입니다.

## ✨ 주요 기능

- 📅 날짜를 직접 선택할 수 있는 커스텀 달력
- 🗓️ 달력에서 월 이동 및 연도 선택
- 🍚 날짜별 급식표 확인
- 📚 학년 · 반별 시간표 확인
- 🌓 시스템 테마 감지 + 라이트/다크 모드
- 💾 사용자가 선택한 테마를 `localStorage`에 저장
- 📱 모바일에서는 급식 / 시간표를 슬라이딩 방식으로 전환
- 🖥️ PC에서는 급식과 시간표를 동시에 표시
- 🔐 NEIS API 인증키를 Cloudflare Worker Secret으로 분리

## 🧩 기술 구성

- **Frontend**: HTML / CSS / JavaScript
- **Font**: Pretendard
- **Backend**: Cloudflare Workers
- **Hosting / CDN**: Cloudflare Workers Assets
- **Data**: NEIS Open API
- **Repository / CI/CD**: GitHub + Cloudflare Workers Builds

별도의 무거운 프런트엔드 프레임워크 없이 필요한 기능에 집중하는 구조입니다.

## 🔒 API 키 보안

NEIS 인증키는 브라우저에 전달하거나 저장소에 기록하지 않습니다.

운영 환경에서는 Cloudflare Worker의 Secret인:

`NEIS_API_KEY`

로 관리합니다.

로컬 개발에서는 `.dev.vars` 또는 `.env`를 사용할 수 있으며 해당 파일은 Git에 커밋하지 않습니다.

## 🛠️ 로컬 실행

의존성을 설치한 다음:

```bash
npm install
npm run dev
```

운영 배포:

```bash
npm run deploy
```

## 📁 프로젝트 구조

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

## 🌐 배포 구조

```text
GitHub main
   ↓
Cloudflare Workers Builds
   ↓
Cloudflare Worker
   ↓
ygmhelper.xyz
```
