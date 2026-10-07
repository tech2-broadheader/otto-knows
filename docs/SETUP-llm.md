# Setup — the LLM "brain" (provider choice)

> The brain (proactive briefing, quick-add, optimizer, tips) is the **paid** tier.
> The **free** tier makes **no LLM calls** (template briefing) — it costs nothing
> to run. The proxy is provider-swappable behind one `LlmClient` interface
> (`apps/web/src/server/llm/`), so you pick a provider with env, no code changes.

## How the provider is chosen
`getLlmClient()` (`apps/web/src/server/llm/client.ts`) selects, in order:
1. `LLM_PROVIDER=gemini` + `GEMINI_API_KEY` → **Gemini**
2. `LLM_PROVIDER=anthropic` (or just `ANTHROPIC_API_KEY` present) → **Claude**
3. neither → **NullLlmClient**: the brief falls back to its template, quick-add/optimizer return nothing, tips are empty. The app stays fully usable on the free/local path with **no key at all**.

## Option A — Gemini (free tier) — current choice
1. Get a key at **aistudio.google.com → API keys**.
2. In `apps/web/.env.local`:
   ```
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=...
   GEMINI_MODEL=gemini-2.5-flash   # a free-tier flash model; change if your account differs
   ```
3. That's it — the brief/quick-add/optimizer/tips now call Gemini with function-calling for the propose-and-confirm proposals.

> ⚠️ **Privacy (read before real data).** Otto handles finance + health context under the PH Data Privacy Act, and its pitch is "your data stays yours / no ads." Google's **free tier may use prompts to improve its products** — that conflicts with that promise. Before pointing Gemini at real user data: review Google's current data-use terms, prefer a **paid/Workspace tier with data-use disabled**, or use Anthropic (Option B), whose API does not train on API inputs. Until then, treat the free tier as **dev/testing only**.
> Reliability: free tiers have low rate limits; `gemini-2.5-flash` does function-calling well, but smaller free models can be flaky with tool-use.

## Option B — Claude (paid, best privacy + tool-use)
```
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
LLM_MODEL=claude-opus-5-5   # or claude-haiku-4-5 (cheapest), claude-sonnet-5-5
```
Cost lever: Opus is most capable; Haiku/Sonnet cut per-user cost a lot. The API does not train on your inputs.

## Local dev with no spend
Leave all LLM keys empty → NullLlmClient → the free/template experience. Set `OTTO_DEV_AUTH=pro` to click through the Pro screens (they just show the template fallback / empty proposals).

## Note on cost economics
Your end users never hold an LLM key — your server calls the provider with **one** key, and that per-user cost is what the Pro price covers (spec §9, §12). Free tier = zero LLM cost by design.
