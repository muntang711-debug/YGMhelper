# 회원 베타 운영

회원 자료는 `AUTH_DB` (`ygmhelper-members-beta`)에 저장하며 급식 평가 `DB`와 분리합니다. 정식 출시 때의 초기화는 별도 작업입니다. 지금 데이터는 삭제하지 않습니다.

## 공개 범위

- 급식: 공개.
- 비회원 시간표: NEIS 첫 교시만 서버에서 반환.
- 회원 시간표: 컴시간 + NEIS 시험일 처리.
- 비회원은 브라우저 가림을 제거해도 컴시간 자료를 받을 수 없음.

## 설정

- `MEMBERSHIP_ENABLED`, `REGISTRATION_OPEN`, `BETA_MODE`: 베타 활성화.
- 운영 Turnstile hostname: `ygmhelper.xyz`. 로컬 widget과 별개.
- Secret `TURNSTILE_SECRET`, `NEIS_API_KEY`, `TEACHER_NAME_MAP`은 공개 저장소에 없음.
- 회원 DDL: `auth-migrations/`. 급식 DDL: `migrations/`.
- 만료 세션/시도 제한 기록은 5분마다 scheduled handler에서 정리.
- 신규 가입은 2026-11-05-beta 동의 버전과 정식 출시 초기화 동의를 요구.

## 정식 출시 전

운영자·문의 연락처 및 국외 이전 상세 고지가 아직 미정임을 처리방침에 표시합니다. 베타라는 이유로 법령 의무가 사라지는 것은 아니며 법령 준수 완료를 보증하지 않습니다.

초기화가 필요할 때 먼저 사용 중인 Worker가 올바른 AUTH_DB를 가리키는지 확인하고, 가입·인증을 닫은 다음 AUTH_DB의 계정·세션·로그인 시도 기록만 대상으로 별도 삭제/새 DB 전환을 수행합니다. 급식 DB를 삭제하거나 전체 프로젝트를 초기화하지 않습니다. Cloudflare 복구용 백업의 만료 기간은 별도로 고려합니다.

로컬 테스트 계정은 운영 DB로 이전하지 않습니다. 테스트 성공만으로 외부 보안 검토를 대신하지 않습니다.
