# TestMe v2 setup and delivery status

## Run locally

Node 22+, `npm ci`, then run in two terminals:

```sh
npx tsx scripts/dev-server.ts
npm run dev
```

The local API provisions a development-only PostgreSQL-compatible database in `.local-db/` and applies committed migrations. It has no fake signed-in users or role bypass. Authentication is tested on an HTTPS Netlify deployment; Identity is not emulated locally.

## Netlify

Connect `mirzakhan-ravshanov/TestMe`, main branch. Build: `npm run build`. Publish: `dist`. Functions: `netlify/functions`. `@netlify/database` and the SQL migrations configure the database at deployment. Netlify Database requires an eligible credit-based plan. Never apply production migrations by hand.

1. In the project's Identity dashboard, enable Identity, open registration and email confirmation.
2. Enable Google under external providers. The app discovers enabled providers via getSettings(). Google/email login use the Identity SDK and its callback handler, including recovery/invite completion.
3. Register your own account. Set server environment variable `ADMIN_IDENTITY_ID` to its verified Identity user ID. Redeploy. No first-signup privilege escalation is used.
4. Set these variables with Functions scope: `TELEGRAM_BOT_USERNAME=testmeauthbot`, `TELEGRAM_BOT_TOKEN` from BotFather, and a random `TELEGRAM_WEBHOOK_SECRET`. Keep all secret values out of source and client-prefixed variables.
5. Configure Telegram Bot API `setWebhook` with URL `https://YOUR-SITE.netlify.app/.netlify/functions/telegram-webhook`, `secret_token` equal to the webhook secret, and allowed updates `message` and `callback_query`. This must be performed using the secret token in a trusted server environment, without logging it.
6. Redeploy after environment changes. Test Google redirect, email confirmation, password recovery, Telegram approval, logout and role access on the real HTTPS deployment.

Telegram starts a five-minute, high-entropy challenge bound to an HttpOnly browser cookie. The bot asks the user to compare a code and confirm. Consumption is transactional and single-use; session tokens are hashed in the database. Telegram accounts and Identity accounts are separate until an explicit account-linking feature is added. Profiles are never merged merely by name/email.

User roles and Pro expiry are stored in PostgreSQL and checked on every protected API call. Administrators can edit roles/expiry via Users. When changing Netlify Identity JWT roles separately, those changes take effect only after login/token refresh; TestMe's app authorization uses database roles.

## Implemented

- Dark responsive Dashboard, Learn, Practice, Class, Tournament and Arcade navigation with the approved logo.
- Free/Pro courses and modules across maths, physics and English; video URL playback (YouTube or direct HTTPS video), text lessons and persisted completion.
- Server-held answer keys, timed attempts, automatic scoring, result review, replay prevention and assignment linkage.
- Teacher class creation with six-character cryptographic codes, joins, membership-checked text chat refreshed every five seconds, assignments/deadlines, teacher grading 2–5 and diary.
- Teacher and learner grade notifications, course/module/test/user/settings administration, configurable Pro price and external payment link.
- Three authentication code paths; live provider configuration is still required.
- Arithmetic Arcade game; tournament creation/registration.

## Remaining production work

This is a working v2 foundation, not the entirety of the earlier long-term specification. Live authentication and production database have not been exercised without account configuration. No live site was deployed in this rebuild.

- Courses contain sample text; real instructional videos and licensed content must be entered by the administrator.
- Admin content editing currently uses a JSON editor; dedicated course, question, upload and layout forms remain to be built.
- Tournament gameplay, schedules, anti-cheat and leaderboards remain; currently creation and enrollment work.
- Chat currently supports text only. Files, audio, replies, reactions, read receipts, typing presence, editing, deletion and moderation remain.
- Automated payment integration/recurring billing, promo codes, refunds, badges, comprehensive reports and audit-log UI remain. A payment link does not grant Pro; an admin must currently set verified subscription expiry.
- Further question types (audio/listening, written answers, formula editor) and cross-device resume remain.
- Rate limits, backup/retention, real-user load testing and operational monitoring should be validated before opening to broad public traffic.

## Verification

`npm run build` checks TypeScript and builds the browser app. `npm test` runs real database integration checks for key secrecy, Pro/admin restrictions, CSRF, server scoring/replay and class/grade permissions. Browser checks cover dashboard, courses, modules and mobile overflow. No passwords or production credentials are stored in browser localStorage.
