# YGMhelper

YGMhelper is a lightweight school-day information web app.

## Stack

- Cloudflare Workers + Workers Assets
- Vanilla HTML/CSS/JavaScript
- Pretendard webfont
- NEIS Open API through a server-side Worker proxy

## Local secret

Create .dev.vars locally and keep it out of git:

NEIS_API_KEY="..."

## Deploy

npm install
npm run deploy

The production NEIS API key is stored in the Cloudflare Worker as the NEIS_API_KEY secret.


<!-- deployment trigger: 2026-10-03 -->
