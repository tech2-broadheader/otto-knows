# Run Otto yourself (personal use, before rollout)

> For a single user (you), skip Supabase auth/billing entirely. Free-tier features
> run fully on-device; the paid "brain" runs via your local backend + a free Gemini
> key, unlocked with the dev bypass. (Verified: the backend boots and `/api/health`
> responds. The app itself hasn't been run on a device yet — expect to shake out a
> few runtime issues the first time.)

## 0. One-time
```bash
pnpm install
```

## 1. Backend (the brain) — `apps/web`
Create `apps/web/.env.local`:
```
LLM_PROVIDER=gemini
GEMINI_API_KEY=<your aistudio.google.com key>
GEMINI_MODEL=gemini-2.5-flash
# Personal use: skip real login — treat every request as a Pro user.
OTTO_DEV_AUTH=pro
NODE_ENV=development
```
Run it:
```bash
pnpm web:dev      # http://localhost:3000
```
Smoke-test it works:
```bash
curl http://localhost:3000/api/health
# {"data":{"status":"ok"}}

curl -s -X POST http://localhost:3000/api/llm/quick-add \
  -H "Content-Type: application/json" \
  -d '{"text":"Pay Meralco 2480 on Saturday"}'
# With OTTO_DEV_AUTH=pro + a valid GEMINI_API_KEY → {"data":{"proposals":[...]}}
# Without the key → falls back (no proposals). Without OTTO_DEV_AUTH → 401.
```

## 2. Mobile app — `apps/mobile`
Create `apps/mobile/.env.local`:
```
# Point the app at your backend. On a real phone this must be your computer's
# LAN IP (NOT localhost) — e.g. http://192.168.1.20:3000. On an emulator,
# localhost works (Android emulator: http://10.0.2.2:3000).
EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000
# Leave EXPO_PUBLIC_SUPABASE_* empty → the app stays local/anonymous (no login).
```

> ⚠️ **The app uses native modules** (SQLite, secure-store, notifications, auth-session)
> that aren't all in Expo Go on SDK 53. Use a **development build**, not Expo Go:
> ```bash
> npm i -g eas-cli   # once
> cd apps/mobile && eas build --profile development --platform android
> ```
> Install the resulting APK on your phone, then `pnpm mobile:start` and open it in
> the dev build. (A local `npx expo run:android` also works if you have Android
> Studio + a device/emulator.)

Free tier (today/reminders/finance/health/routine) works offline with no backend.
The brain (Today's brief, Quick Add, Optimizer, Tips) calls your backend from step 1.

## 3. Important caveats for personal use
- **Gemini free tier may use your inputs to improve Google's products.** For your own
  data that's your call — just know bills/meds you enter go to Google under the free
  tier. Switch to Claude or a paid Gemini tier (data-use off) before anyone else's data.
- This is the **first real run** — the design + flows are verified by typecheck/tests/
  bundle but not on a screen. Note anything that misbehaves and it's fixable.
- Your data lives **on the device** (SQLite). No cloud backup yet (that's Phase 5).

## Where things are
- Provider/keys: `docs/SETUP-llm.md`
- Real auth/DB (for rollout): `docs/SETUP-supabase.md`
- What's built / pending: `_bmad-output/implementation-artifacts/sprint-status.yaml`
