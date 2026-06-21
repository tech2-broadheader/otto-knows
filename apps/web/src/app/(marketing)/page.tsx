import type { Metadata } from "next";
import HeroArt from "./HeroArt";
import "./marketing.css";

/**
 * Otto marketing site — the public landing page.
 * Faithful port of the approved Claude Design prototype (Website.html).
 * Server component: no client interactivity, just anchor nav + CSS hover.
 * All visual decisions live in marketing.css (CLAUDE.md §5 — implement the
 * approved design faithfully, don't redesign here).
 */

export const metadata: Metadata = {
  title: "Otto — Your day, already sorted.",
  description:
    "Otto quietly connects your calendar, bills, meds and routine — then tells you what actually matters today. One calm brief. No nagging. No ads.",
};

/** Recurring checkmark used in feature/pricing lists. */
function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** Flow arrow between "how it works" nodes. */
function FlowArrow() {
  return (
    <svg className="flow__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function MarketingPage() {
  return (
    <>
      {/* ===================== NAV ===================== */}
      <nav className="nav">
        <div className="wrap nav__in">
          <a className="brand" href="#top">
            <img src="/otto/assets/otto-clam.png" alt="Otto" />
            <b>Otto</b>
          </a>
          <div className="nav__links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#privacy">Privacy</a>
          </div>
          <div className="nav__cta">
            <a href="#pricing" className="btn btn--ghost" style={{ padding: "10px 18px" }}>
              Sign in
            </a>
            <a href="#download" className="btn btn--primary" style={{ padding: "11px 20px" }}>
              Get Otto free
            </a>
          </div>
        </div>
      </nav>

      {/* ===================== HERO ===================== */}
      <header className="hero" id="top">
        <svg className="hero__ripple" viewBox="0 0 1440 700" preserveAspectRatio="none" fill="none">
          <path d="M-40 540 Q 360 480 720 540 T 1480 540" stroke="rgba(16,160,116,.22)" strokeWidth={2} />
          <path d="M-40 580 Q 360 520 720 580 T 1480 580" stroke="rgba(16,160,116,.16)" strokeWidth={2} />
          <path d="M-40 620 Q 360 560 720 620 T 1480 620" stroke="rgba(16,160,116,.10)" strokeWidth={2} />
        </svg>
        <div className="hero__glow" />
        <div className="wrap hero__in">
          <div>
            <div className="eyebrow">Proactive daily assistant · Manila</div>
            <h1>
              Your day,
              <br />
              <span className="spark">already sorted.</span>
            </h1>
            <p className="sub">
              Otto quietly connects your calendar, bills, meds and routine — then tells you what actually matters
              today. One calm brief. No nagging. No ads.
            </p>
            <div className="hero__ctas">
              <a href="#download" className="btn btn--primary" style={{ padding: "15px 26px", fontSize: 16 }}>
                Get Otto free
              </a>
              <a
                href="#how"
                className="btn"
                style={{
                  padding: "15px 26px",
                  fontSize: 16,
                  background: "rgba(255,255,255,.08)",
                  color: "#fff",
                  boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.18)",
                }}
              >
                See how it works
              </a>
            </div>
            <div className="hero__trust">
              <div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M20 6L9 17l-5-5" />
                </svg>{" "}
                Free forever tier
              </div>
              <div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>{" "}
                No ads, ever
              </div>
              <div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M5 13l4 4L19 7" />
                </svg>{" "}
                DPA-compliant
              </div>
            </div>
          </div>
          <HeroArt />
        </div>
      </header>

      {/* ===================== THESIS ===================== */}
      <section className="thesis" id="why">
        <div className="wrap">
          <div className="sec-head center mx-auto">
            <div className="eyebrow">The core idea</div>
            <h2>Free remembers. Pro thinks.</h2>
            <p className="mx-auto">
              A calendar that knows payday is Friday and the bill is due Saturday — and says so as one brief —
              isn&apos;t a calendar anymore. It&apos;s an assistant.
            </p>
          </div>
          <div className="thesis__grid">
            <div className="thesis__card free">
              <span className="pill pill--free">FREE · The organizer</span>
              <h3>It remembers and reminds.</h3>
              <p className="lead">
                A smart organizer that holds your day together — calendar, bills, meds and a fixed routine, all
                timed to your real rhythm.
              </p>
              <ul>
                <li>
                  <Check /> Calendar, reminders &amp; events, read in
                </li>
                <li>
                  <Check /> Manual finance + a simple monthly budget
                </li>
                <li>
                  <Check /> A fixed daily routine you define once
                </li>
                <li>
                  <Check /> Routine-timed reminders &amp; a today brief
                </li>
              </ul>
            </div>
            <div className="thesis__card paid">
              <span className="pill pill--pro">PRO · The assistant</span>
              <h3>It thinks and adjusts.</h3>
              <p className="lead">
                The reasoning layer. Otto reads across every silo, sees what&apos;s coming, and reshapes your day —
                always proposing, never overruling.
              </p>
              <ul>
                <li>
                  <Check /> Proactive cross-domain nudges
                </li>
                <li>
                  <Check /> The routine optimizer (propose-and-confirm)
                </li>
                <li>
                  <Check /> Adaptive routine that learns your rhythm
                </li>
                <li>
                  <Check /> Gentle finance &amp; health tips, plus caregiver mode
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section id="features">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">What Otto does</div>
            <h2>One assistant, your whole day.</h2>
            <p>Not six apps glued together — one context graph, read through the lens of your routine.</p>
          </div>
          <div className="feat">
            <div className="feature">
              <div className="ficon" style={{ background: "var(--otto-mist)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--otto-green)" strokeWidth={2}>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2 2M17 17l2 2M19.1 4.9l-2 2M7 17l-2 2" />
                </svg>
              </div>
              <h3>Daily briefing</h3>
              <p>
                Morning, midday and wind-down — Otto speaks at the right moments in your real day, in one warm
                voice instead of a list dump.
              </p>
              <div className="tag">
                <span className="pill pill--free">Free</span>
              </div>
            </div>
            <div className="feature">
              <div className="ficon" style={{ background: "var(--amber-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth={2}>
                  <path d="M12 2a7 7 0 0 0-7 7c0 3-1.5 5-2 6h18c-.5-1-2-3-2-6a7 7 0 0 0-7-7z" />
                  <path d="M9.5 20a2.5 2.5 0 0 0 5 0" />
                </svg>
              </div>
              <h3>Proactive nudges</h3>
              <p>
                “Payday Friday vs. bill Saturday.” Otto connects the dots across calendar, money and meds — the
                synthesis that makes it feel alive.
              </p>
              <div className="tag">
                <span className="pill pill--pro">Pro</span>
              </div>
            </div>
            <div className="feature">
              <div className="ficon" style={{ background: "var(--otto-mist)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--otto-green)" strokeWidth={2}>
                  <path d="M3 12h4l3-8 4 16 3-8h4" />
                </svg>
              </div>
              <h3>Routine optimizer</h3>
              <p>
                “Make room for a 30-min workout, 4× a week.” Otto reshapes your day with reasoning — then waits for
                your yes before changing a thing.
              </p>
              <div className="tag">
                <span className="pill pill--pro">Pro</span>
              </div>
            </div>
            <div className="feature">
              <div className="ficon" style={{ background: "var(--otto-mist)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--otto-green)" strokeWidth={2}>
                  <path d="M3 3v18h18" />
                  <rect x="7" y="11" width="3" height="6" />
                  <rect x="12" y="7" width="3" height="10" />
                  <rect x="17" y="13" width="3" height="4" />
                </svg>
              </div>
              <h3>Money, minus the spreadsheet</h3>
              <p>
                Track income, bills and a simple budget. Otto flags overspend before it happens and warns you when
                a bill collides with payday.
              </p>
              <div className="tag">
                <span className="pill pill--free">Free</span> <span className="pill pill--pro">Pro forecasts</span>
              </div>
            </div>
            <div className="feature">
              <div className="ficon" style={{ background: "var(--coral-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth={2}>
                  <path d="M8 2v4M16 2v4" />
                  <rect x="4" y="5" width="16" height="17" rx="2" />
                  <path d="M9 13h6M12 10v6" />
                </svg>
              </div>
              <h3>Meds, on rhythm</h3>
              <p>
                Your medications fire at the right moment in your day — not a generic alarm. Otto even sees a
                refill coming before you run out.
              </p>
              <div className="tag">
                <span className="pill pill--free">Free</span>
              </div>
            </div>
            <div className="feature">
              <div className="ficon" style={{ background: "var(--otto-mist)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--otto-green)" strokeWidth={2}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>Caregiver mode</h3>
              <p>
                Get a parent&apos;s med alerts and bill due dates on your phone. The headline feature for families
                who look out for each other.
              </p>
              <div className="tag">
                <span className="pill pill--pro">Pro</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section className="how" id="how">
        <div className="wrap">
          <div className="sec-head center mx-auto">
            <div className="eyebrow">Under the surface</div>
            <h2>Routine is the lens.</h2>
            <p className="mx-auto">
              Your calendar, money and meds are data. Your routine is the model of <em>you</em> that makes all of
              it well-timed and personal.
            </p>
          </div>
          <div className="flow">
            <div className="flow__node">
              <div className="sources">
                <span className="src-chip">Calendar</span>
                <span className="src-chip">Reminders</span>
                <span className="src-chip">Events</span>
                <span className="src-chip">Finance</span>
                <span className="src-chip">Health</span>
              </div>
              <h4>Context graph</h4>
              <p>Everything you care about, unified in one model — not five apps that never talk.</p>
            </div>
            <FlowArrow />
            <div className="flow__node lens">
              <h4>Routine layer</h4>
              <p>
                The recurring rhythm of your day — wake, meds, work, meals, wind-down. The lens everything is read
                through.
              </p>
            </div>
            <FlowArrow />
            <div className="flow__node">
              <h4>Otto&apos;s brief &amp; nudges</h4>
              <p>
                Reasoning over the graph, then acting — create a reminder, log an expense, block time — always with
                your confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PRICING ===================== */}
      <section id="pricing">
        <div className="wrap">
          <div className="sec-head center mx-auto">
            <div className="eyebrow">Simple pricing · Philippine Peso</div>
            <h2>Pay us, not your attention.</h2>
            <p className="mx-auto">
              Free is a genuinely useful organizer. Pro is the assistant. And if you hate subscriptions, buy it
              once for life.
            </p>
          </div>
          <div className="price-grid">
            <div className="price">
              <h3>Free</h3>
              <p className="who">For getting your day in one place.</p>
              <div className="amt">₱0</div>
              <ul>
                <li>
                  <Check /> Calendar, reminders &amp; events
                </li>
                <li>
                  <Check /> Up to 5 bills · 3 meds
                </li>
                <li>
                  <Check /> Fixed daily routine + brief
                </li>
              </ul>
              <a href="#download" className="btn btn--ghost" style={{ justifyContent: "center" }}>
                Start free
              </a>
            </div>
            <div className="price feature-pop">
              <span className="ribbon">Most popular</span>
              <h3>Pro Annual</h3>
              <p className="who">The assistant, all year — about ₱50/mo.</p>
              <div className="amt">
                ₱599<small>/yr</small>
              </div>
              <ul>
                <li>
                  <Check /> Everything in Free, unlimited
                </li>
                <li>
                  <Check /> Proactive AI + adaptive routine
                </li>
                <li>
                  <Check /> Optimizer, tips &amp; forecasts
                </li>
                <li>
                  <Check /> Caregiver mode + cloud sync
                </li>
              </ul>
              <a href="#download" className="btn btn--primary" style={{ justifyContent: "center" }}>
                Go Pro
              </a>
            </div>
            <div className="price">
              <h3>Pro Monthly</h3>
              <p className="who">Try the brain, month to month.</p>
              <div className="amt">
                ₱99<small>/mo</small>
              </div>
              <ul>
                <li>
                  <Check /> All Pro features
                </li>
                <li>
                  <Check /> Cancel anytime
                </li>
                <li>
                  <Check /> No commitment
                </li>
              </ul>
              <a href="#download" className="btn btn--ghost" style={{ justifyContent: "center" }}>
                Choose monthly
              </a>
            </div>
            <div className="price">
              <h3>Lifetime</h3>
              <p className="who">One payment. Yours forever.</p>
              <div className="amt">₱1,299</div>
              <ul>
                <li>
                  <Check /> All Pro features, for good
                </li>
                <li>
                  <Check /> No recurring charge
                </li>
                <li>
                  <Check /> Future updates included
                </li>
              </ul>
              <a href="#download" className="btn btn--dark" style={{ justifyContent: "center" }}>
                Buy lifetime
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PRIVACY ===================== */}
      <section className="privacy" id="privacy">
        <div className="wrap privacy__in">
          <div>
            <div className="eyebrow">Built on trust</div>
            <h2>Your life, not our inventory.</h2>
            <p className="privacy__lead">
              Otto handles money, meds and your daily rhythm. That only works if you trust it — so the business
              model is simple: you pay us instead of being sold.
            </p>
            <div className="privacy__pts">
              <div className="privacy__pt">
                <div className="pi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
                  </svg>
                </div>
                <div>
                  <h4>No ads. No data sales.</h4>
                  <p>
                    Your finance and health data is never used for advertising. Not now, not ever — it&apos;s the
                    whole point.
                  </p>
                </div>
              </div>
              <div className="privacy__pt">
                <div className="pi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h4>DPA-compliant by design</h4>
                  <p>
                    Granular, per-source consent and encryption baked in from day one — aligned with the PH Data
                    Privacy Act.
                  </p>
                </div>
              </div>
              <div className="privacy__pt">
                <div className="pi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <div>
                  <h4>It proposes, you confirm</h4>
                  <p>
                    Otto never silently rewrites your day. Every change is a suggestion you accept — respectful,
                    never bossy.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="privacy__clam">
            <img src="/otto/assets/otto-clam.png" alt="Otto pearl" />
            <p className="cap">The pearl is your data. Otto just keeps the shell.</p>
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section id="download">
        <div className="wrap">
          <div className="cta-band">
            <div className="cta-band__glow" />
            <div style={{ position: "relative" }}>
              <h2>Let Otto take the morning.</h2>
              <p>Free to start. Android first, iPhone soon.</p>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="#" className="btn btn--primary" style={{ padding: "16px 28px", fontSize: 16 }}>
                  Get it on Google Play
                </a>
                <a href="#" className="btn btn--mint" style={{ padding: "16px 28px", fontSize: 16 }}>
                  Join the iPhone waitlist
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="foot-wrap">
        <div className="wrap">
          <div className="foot">
            <div style={{ maxWidth: 280 }}>
              <a className="brand" href="#top" style={{ marginBottom: 14 }}>
                <img src="/otto/assets/otto-clam.png" alt="Otto" />
                <b>Otto</b>
              </a>
              <p style={{ color: "var(--ink-500)", fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>
                A proactive daily assistant, made in Manila. Otto knows what your day needs.
              </p>
            </div>
            <div className="foot__cols">
              <div className="foot__col">
                <h5>Product</h5>
                <a href="#features">Features</a>
                <a href="#how">How it works</a>
                <a href="#pricing">Pricing</a>
                <a href="#download">Download</a>
              </div>
              <div className="foot__col">
                <h5>Company</h5>
                <a href="#">About</a>
                <a href="#">Blog</a>
                <a href="#">Careers</a>
                <a href="#">Contact</a>
              </div>
              <div className="foot__col">
                <h5>Trust</h5>
                <a href="/privacy">Privacy stance</a>
                <a href="/privacy">Data Privacy Act</a>
                <a href="/terms">Terms</a>
                <a href="/privacy#security">Security</a>
              </div>
            </div>
          </div>
          <div className="foot__bottom">
            <span>© 2026 Broadheader · Otto. Hawak ang araw mo.</span>
            <span>Made with care in Manila 🇵🇭</span>
          </div>
        </div>
      </footer>
    </>
  );
}
