# YGMhelper

학교 시간표와 급식 정보를 한 곳에서 확인하는 웹 서비스입니다.

## 기술 구성

- HTML / CSS / JavaScript
- Cloudflare Pages
- Cloudflare Pages Functions
- NEIS Open API
- 사용자 설정: LocalStorage

## 보안

NEIS 인증키는 소스 코드에 포함하지 않습니다.

운영 환경에서는 Cloudflare Pages의 Secret에 다음 값을 등록합니다.

- NEIS_API_KEY

로컬 개발에서는 .dev.vars 파일을 사용하며, 해당 파일은 Git에 커밋하지 않습니다.

## Cloudflare Pages 설정

- Framework preset: None
- Build command: 없음
- Build output directory: .

Cloudflare Pages Functions는 functions/ 디렉터리를 자동으로 라우팅합니다.

## API

- GET /api/meal?date=YYYYMMDD
- GET /api/timetable?date=YYYYMMDD&grade=1&class=1
- GET /api/health

## 로컬 개발

Cloudflare Wrangler를 사용한다면 프로젝트 루트에서 다음과 같이 실행할 수 있습니다.

1. .dev.vars.example을 복사하여 .dev.vars를 만듭니다.
2. .dev.vars의 NEIS_API_KEY에 개인 인증키를 입력합니다.
3. Wrangler의 Pages 로컬 개발 명령으로 실행합니다.

실제 운영 인증키는 README나 소스 코드에 기록하지 않습니다.

## 배포

GitHub의 main 브랜치를 Cloudflare Pages에 연결한 뒤 push가 발생하면 자동 배포되도록 구성합니다.

도메인: https://ygmhelper.xyz
