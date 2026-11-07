# 도메인 메일 운영

2026-11-06에 Cloudflare Email Service에서 `ygmhelper.xyz` 발신 도메인을 인증했다.

- 발신 주소: `noreply@ygmhelper.xyz`
- 문의 주소: `support@ygmhelper.xyz`
- 문의 수신은 Cloudflare Email Routing을 통해 운영자의 인증된 기존 메일함으로 전달한다. 개인 전달 주소는 공개 저장소에 기록하지 않는다.
- 모든 주소를 전달하는 catch-all은 사용하지 않는다.
- SPF, DKIM, DMARC와 발신 반송용 MX, 수신 MX는 Cloudflare DNS에서 관리한다.
- 발신과 수신은 실제 확인 메일의 기존 메일함 도착까지 확인했다.

회원가입은 아이디·이메일·비밀번호를 받고 이메일 인증 완료 후 로그인할 수 있다. 인증 링크는 30분, 재설정 링크는 15분 유효하며 1회 사용 후 무효화한다. 토큰은 SHA-256 해시로만 DB에 저장하고 링크 원문은 메일로 전달한다. 링크 토큰은 URL fragment로 전달하고 페이지 로드 시 주소에서 제거한다. GET 요청만으로는 인증이나 비밀번호 변경을 수행하지 않는다.

비밀번호 찾기 응답은 계정 존재 여부와 무관하게 동일하다. 발송은 요청 생명주기에 연결된 waitUntil에서 처리한다. 이메일별·IP별·전체 발송 제한과 60초 재발송 대기 시간을 적용한다. 재설정 시 기존 세션과 토큰을 모두 삭제하고 변경 알림을 발송한다.

메일 발송용 공개 API를 만들지 않는다. Worker는 공식 `send_email` 바인딩 `EMAIL`을 사용하고 발신 주소를 `noreply@ygmhelper.xyz`로 제한한다. 인증 키나 운영자의 개인 전달 주소를 프런트엔드에 넣지 않는다.

Cloudflare Email Routing은 Gmail과 같은 메일함 UI나 IMAP 서버를 제공하지 않는다. Gmail에서 회신할 때 도메인 발신 주소를 사용하려면 별도의 SMTP '다른 주소에서 보내기' 구성이 필요하며, 수신 전달만으로 발신 주소가 바뀌지는 않는다.

- https://developers.cloudflare.com/email-service/get-started/send-emails/
- https://developers.cloudflare.com/email-service/get-started/route-emails/

2026-11-07: 로그인 유지 미선택은 세션 쿠키(서버 최대 24시간/비활동 2시간), 선택은 최대 30일의 고정 만료 쿠키와 DB 세션을 사용한다. 가입 브라우저에 HttpOnly 인증 쿠키를 발급하고 메일 토큰에 그 해시를 연결한다. 같은 브라우저의 인증 링크는 자동 로그인하고, 다른 브라우저는 이메일만 인증한 뒤 비밀번호 로그인을 요구한다. 기존 토큰은 인증을 완료할 수 있으나 브라우저 연결 정보가 없어 자동 로그인하지 않는다. 인증·메일 발송·비밀번호 변경 완료는 각각 별도 화면으로 이동한다. 로그인 페이지에는 비밀번호 찾기만 표시하고 재발송은 메일 확인 화면의 도움말 안에 둔다.

이전 help 주소의 전달 규칙은 기존 메일 수신을 위해 유지하지만 화면과 발신 메일의 공개 문의 주소는 support로 통일한다.

흐름 참고: https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options 및 https://developer.auth0.com/resources/labs/authentication/passwordless-with-email . 특정 서비스의 화면을 복제하지 않고 단계별 인증과 동일 브라우저 링크 확인 방식을 참고했다.
