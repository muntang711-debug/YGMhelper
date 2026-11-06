# 도메인 메일 운영

2026-11-06에 Cloudflare Email Service에서 `ygmhelper.xyz` 발신 도메인을 인증했다.

- 발신 주소: `noreply@ygmhelper.xyz`
- 문의 주소: `help@ygmhelper.xyz`
- 문의 수신은 Cloudflare Email Routing을 통해 운영자의 인증된 기존 메일함으로 전달한다. 개인 전달 주소는 공개 저장소에 기록하지 않는다.
- 모든 주소를 전달하는 catch-all은 사용하지 않는다.
- SPF, DKIM, DMARC와 발신 반송용 MX, 수신 MX는 Cloudflare DNS에서 관리한다.
- 발신과 수신은 실제 확인 메일의 기존 메일함 도착까지 확인했다.

현재 회원가입은 아이디·비밀번호 방식이다. 이메일 인증·비밀번호 재설정 기능을 추가할 때는 저장 항목과 동의 안내, 토큰 만료·1회 사용, 재전송 제한을 함께 설계해야 한다.

메일 발송용 공개 API를 만들지 않는다. Worker에서 발송 기능을 추가할 때에는 공식 `send_email` 바인딩을 사용하고 발신 주소를 제한한다. 인증 키나 운영자의 개인 전달 주소를 프런트엔드에 넣지 않는다.

Cloudflare Email Routing은 Gmail과 같은 메일함 UI나 IMAP 서버를 제공하지 않는다. Gmail에서 회신할 때 도메인 발신 주소를 사용하려면 별도의 SMTP '다른 주소에서 보내기' 구성이 필요하며, 수신 전달만으로 발신 주소가 바뀌지는 않는다.

- https://developers.cloudflare.com/email-service/get-started/send-emails/
- https://developers.cloudflare.com/email-service/get-started/route-emails/
