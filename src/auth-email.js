const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function renderAuthEmail(kind,link,minutes) {
 const copy={
  verify:{title:'이메일을 인증해 주세요',description:'아래 버튼을 누르면 가입이 완료됩니다.',detail:'가입한 브라우저에서 열면 바로 로그인됩니다.',button:'이메일 인증'},
  reset:{title:'비밀번호 재설정',description:'아래 버튼에서 새 비밀번호를 설정해 주세요.',detail:'변경이 완료되면 기존 로그인은 모두 해제됩니다.',button:'새 비밀번호 설정'},
  changed:{title:'비밀번호가 변경됐습니다',description:'새 비밀번호가 저장됐으며 기존 로그인은 모두 해제됐습니다.',detail:'직접 변경하지 않았다면 비밀번호 찾기를 진행하고 문의해 주세요.',button:'비밀번호 찾기'}
 }[kind];
 if(!copy)throw Error('Unknown auth email kind');
 const expiry=kind==='changed'?'':`이 링크는 ${minutes}분 동안 한 번만 사용할 수 있습니다.`;
 const safeLink=escapeHtml(link);
 const text=`YGMhelper\n\n${copy.title}\n\n${copy.description}\n${copy.detail}\n\n${copy.button}: ${link}\n\n${expiry}\n${kind==='changed'?'':'직접 요청하지 않았다면 이 메일을 무시해 주세요.\n'}문의: support@ygmhelper.xyz`;
 const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${copy.title}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;color:#202124;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic','Segoe UI',sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.description}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e8f0;border-radius:12px;">
<tr><td style="padding:24px 32px;border-bottom:1px solid #e3e8f0;"><a href="https://ygmhelper.xyz" style="color:#202124;font-size:18px;font-weight:700;letter-spacing:-.3px;text-decoration:none;">YGMhelper</a></td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 20px;color:#202124;font-size:24px;line-height:1.5;font-weight:700;letter-spacing:-.4px;">${copy.title}</h1>
<p style="margin:0;color:#63676f;font-size:14px;line-height:1.7;">${copy.description}<br>${copy.detail}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td bgcolor="#202124" style="border-radius:10px;text-align:center;"><a href="${safeLink}" style="display:inline-block;padding:15px 26px;border:1px solid #202124;border-radius:10px;color:#ffffff;background:#202124;text-decoration:none;font-size:15px;font-weight:700;line-height:1.3;">${copy.button}</a></td></tr></table>
${expiry?`<p style="margin:0 0 20px;color:#63676f;font-size:13px;line-height:1.7;">${expiry}</p>`:''}
<p style="margin:0;padding-top:20px;border-top:1px solid #e3e8f0;color:#63676f;font-size:12px;line-height:1.8;">${kind==='changed'?'': '직접 요청하지 않았다면 이 메일을 무시해 주세요.<br>'}문의는 <a href="mailto:support@ygmhelper.xyz" style="color:#202124;text-decoration:underline;">support@ygmhelper.xyz</a>로 보내 주세요.</p>
</td></tr></table>
<p style="max-width:560px;margin:16px 0 0;color:#63676f;font-size:11px;line-height:1.7;">버튼이 열리지 않으면 아래 링크를 복사해 브라우저에서 열어 주세요.</p>
<p style="max-width:560px;margin:6px 0 0;text-align:left;word-break:break-all;overflow-wrap:anywhere;font-size:11px;line-height:1.7;"><a href="${safeLink}" style="color:#63676f;word-break:break-all;">${safeLink}</a></p>
</td></tr></table></body></html>`;
 return {html,text};
}
