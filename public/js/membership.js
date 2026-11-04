const link=document.querySelector('#member-link');
try{const r=await fetch('/api/auth/session',{cache:'no-store',credentials:'same-origin'});if(r.ok){const b=await r.json();link.hidden=false;link.textContent=b.user?'내 계정':'로그인';link.href=b.user?'/account.html':'/login.html';}}catch{}
