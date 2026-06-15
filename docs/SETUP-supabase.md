# Setup — Supabase auth + entitlement (go-live)

> The auth + entitlement code is built and unit-tested with mocks. It goes live the
> moment these values exist. Until then, every Pro route returns 401 (except the
> dev bypass below). Free tier needs none of this — it's local-first (ADR-002).

## 1. Create a Supabase project
Grab from **Project Settings → API** and **Database**:

| Env var (`apps/web/.env.local`) | Where |
|--------------------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | API → service_role key (server only) |
| `DATABASE_URL` | Database → Connection string (direct, server only) |
| `ANTHROPIC_API_KEY` | the LLM proxy key |

Mobile reads `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` (same URL/anon).

## 2. Create the `profiles` table
Either apply the generated Drizzle migration:

```bash
DATABASE_URL=... pnpm --filter @otto/web db:migrate
```

…or run the equivalent SQL in the Supabase SQL editor (`drizzle/0000_init_profiles.sql`):

```sql
CREATE TYPE entitlement AS ENUM ('free', 'pro', 'lifetime');
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  entitlement entitlement NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## 3. Auto-create a profile on signup + lock it down (RLS)
```sql
-- Create a free profile whenever a user signs up.
CREATE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: users may read their own profile; only the service role writes entitlement.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
```
> The server reads entitlement over the direct `DATABASE_URL` connection (bypasses RLS by design). Entitlement is written by the billing flow (E9, not yet built) using the service role — never by the client.

## 4. How it works
- Mobile sends the Supabase access token as `Authorization: Bearer <token>`.
- `getAuthContext` (`apps/web/src/server/auth.ts`) verifies it via `supabase.auth.getUser()` and loads `profiles.entitlement` (default `free`).
- Pro routes (`/api/llm/*`, `/api/sync`) gate on `isProEntitled`.

## 5. Local dev without Supabase
Set `OTTO_DEV_AUTH=pro` (never in production) to bypass auth as a Pro user and exercise the brain with just an `ANTHROPIC_API_KEY`.

## Still TODO (separate tracks)
- **Billing (E9)** writes `entitlement` after purchase (store IAP / RevenueCat).
- **Cloud sync (E10)** — the `profiles` schema is the start; entity sync tables come with the backup/sync feature.
