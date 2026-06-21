import type { Metadata } from "next";
import Link from "next/link";
import "../marketing.css";

/**
 * Otto — Privacy Policy (/privacy).
 * Server component. Plain, readable legal prose that reflects Otto's real
 * data practices, written to be PH Data Privacy Act (RA 10173) aware.
 * Draft template — see the in-page note; review with counsel before launch.
 */

export const metadata: Metadata = {
  title: "Privacy Policy — Otto",
  description:
    "How Otto handles your calendar, finance, health and routine data — local-first, encrypted, no ads, no data sales. Aligned with the PH Data Privacy Act (RA 10173).",
};

/** Shared top bar for legal pages — Otto wordmark links home. */
function LegalNav() {
  return (
    <nav className="nav">
      <div className="wrap nav__in">
        <Link className="brand" href="/">
          <img src="/otto/assets/otto-clam.png" alt="Otto" />
          <b>Otto</b>
        </Link>
        <div className="nav__cta">
          <Link href="/" className="btn btn--ghost" style={{ padding: "10px 18px" }}>
            Back to home
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <LegalNav />
      <main className="legal">
        <p className="legal__draft">
          Draft template — review with legal counsel before launch. This document describes
          Otto&apos;s intended practices and is not yet final legal text.
        </p>

        <p className="legal__eff">Effective date: [DATE]</p>
        <h1>Privacy Policy</h1>
        <p>
          Otto is a proactive personal daily assistant built by <strong>Broadheader</strong> (Manila,
          Philippines). This policy explains what data Otto handles, how it is stored and secured, when
          it leaves your device, and the rights you have over it. We have written it to align with the
          Philippine Data Privacy Act of 2012 (RA 10173).
        </p>
        <p>
          Otto&apos;s core promise is simple: <strong>you pay us, you are not the product</strong>. We do
          not show ads and we do not sell your data.
        </p>

        <h2>1. What Otto handles, and with your consent</h2>
        <p>
          Otto only connects to a data source after you grant <strong>granular, per-source consent</strong>.
          Each source is opt-in and can be turned off independently. Otto handles:
        </p>
        <ul>
          <li>
            <strong>Calendar &amp; reminders</strong> — read-only access to your Google Calendar, only if you
            connect it. Otto reads your schedule to time its brief and nudges; it does not silently write
            events.
          </li>
          <li>
            <strong>Events</strong> — items you add or that come from a connected calendar.
          </li>
          <li>
            <strong>Finance</strong> — bills, budget and income that <strong>you enter manually</strong>. Otto
            does not connect to your bank.
          </li>
          <li>
            <strong>Health</strong> — medications that <strong>you enter manually</strong>. This is the most
            sensitive category and is <strong>off by default</strong>; you must explicitly enable it.
          </li>
          <li>
            <strong>Your daily routine</strong> — the recurring rhythm of your day that you define, used as the
            lens for timing everything else.
          </li>
        </ul>

        <h2>2. Where your data lives, and how it is secured</h2>
        <p>
          Otto is <strong>local-first</strong>. On the free tier, your data lives on your device in a local
          database (SQLite). It is not uploaded to our servers for storage.
        </p>
        <ul>
          <li>
            Sensitive finance and health fields are <strong>encrypted at rest</strong> using authenticated
            <strong> AES-256-GCM</strong>.
          </li>
          <li>
            The encryption key is held in your device&apos;s secure store — the <strong>iOS Keychain</strong> or
            <strong> Android Keystore</strong> — not in plain storage and not on our servers.
          </li>
          <li>
            Access to your finance and health records is <strong>audit-logged on your device</strong>, so there
            is a record of when sensitive data was read.
          </li>
        </ul>

        <h2 id="security">3. The &quot;brain&quot;: when context leaves your device</h2>
        <p>
          Otto&apos;s paid features — the daily brief, quick-add, the routine optimizer, and tips — use AI to
          reason about your day. To generate a suggestion, the relevant context for that request is sent
          through Otto&apos;s <strong>server proxy</strong> to a third-party AI provider (currently
          <strong> Google Gemini</strong> and/or <strong>Anthropic Claude</strong>), processed
          <strong> transiently</strong> to produce the response, and returned to you.
        </p>
        <p>
          This happens only when you use a feature that requires it. Some AI providers&apos; free tiers may use
          inputs to improve their products. Otto&apos;s intent for production is to use providers and tiers that
          <strong> do not train on user data</strong>.
        </p>

        <h2>4. Propose-and-confirm — you stay in control</h2>
        <p>
          Otto never silently writes to your data, your calendar, or your finances. Every change Otto suggests
          is a proposal you explicitly accept before anything happens. This is a deliberate safety rule, not
          just a design choice.
        </p>

        <h2>5. No ads. No data sales.</h2>
        <p>
          Your finance and health data is <strong>never used for advertising and never sold</strong> — not now,
          not ever. This is the whole point of Otto&apos;s business model: you pay for the product, so you are
          never the product.
        </p>

        <h2>6. Your rights under the Data Privacy Act</h2>
        <p>
          As a data subject under RA 10173, you have the right to <strong>access</strong> your data,
          <strong> correct</strong> it, <strong>object</strong> to processing, and request its
          <strong> deletion</strong>.
        </p>
        <ul>
          <li>
            <strong>Deletion is available in the app.</strong> From Settings, you can delete your account, which
            removes your account and your on-device data.
          </li>
          <li>
            For any other request — access, correction, or objection — contact us at the address below.
          </li>
        </ul>

        <h2>7. Cloud sync &amp; backup (future Pro feature)</h2>
        <p>
          Cloud sync and backup is a <strong>planned future Pro feature</strong>. <strong>Today</strong>, Otto
          does not sync or back up your data to the cloud — it stays on your device. The only data that reaches
          our servers today is the context sent transiently to process a brain request (see section 3); it is
          not stored there as a copy of your account. If and when cloud sync ships, we will update this policy
          and ask for your consent before enabling it.
        </p>

        <h2>8. Children</h2>
        <p>
          Otto is intended for adults. It is not directed at children, and we do not knowingly collect data
          from children.
        </p>

        <h2>9. Changes to this policy</h2>
        <p>
          We may update this policy as Otto evolves. When we make material changes, we will update the
          effective date above and, where appropriate, notify you in the app.
        </p>

        <h2>10. Contact</h2>
        <p>
          For privacy questions or to exercise your rights, contact us at{" "}
          <a href="mailto:tech@broadheader.com">tech@broadheader.com</a>.
        </p>

        <p className="legal__small">
          Broadheader · Manila, Philippines. This is a draft template and does not constitute legal advice.
        </p>

        <div className="legal__foot">
          <Link href="/">← Back to home</Link>
          <Link href="/terms">Terms of Service →</Link>
        </div>
      </main>
    </>
  );
}
