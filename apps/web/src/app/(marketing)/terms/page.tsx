import type { Metadata } from "next";
import Link from "next/link";
import "../marketing.css";

/**
 * Otto — Terms of Service (/terms).
 * Server component. Plain, fair terms covering acceptable use, the
 * non-advice nature of Otto's tips, propose-and-confirm, subscription
 * tiers, warranty/liability template language, and governing law.
 * Draft template — see the in-page note; review with counsel before launch.
 */

export const metadata: Metadata = {
  title: "Terms of Service — Otto",
  description:
    "The terms for using Otto: acceptable use, that briefs and tips are general and not medical or financial advice, subscription tiers, and governing law (Philippines).",
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

export default function TermsPage() {
  return (
    <>
      <LegalNav />
      <main className="legal">
        <p className="legal__draft">
          Draft template — review with legal counsel before launch. This document is a starting point and is
          not yet final legal text.
        </p>

        <p className="legal__eff">Effective date: [DATE]</p>
        <h1>Terms of Service</h1>
        <p>
          These terms govern your use of Otto, a proactive personal daily assistant provided by{" "}
          <strong>Broadheader</strong> (Manila, Philippines). By using Otto, you agree to these terms. If you
          do not agree, please do not use the app.
        </p>

        <h2>1. Acceptable use</h2>
        <p>You agree to use Otto lawfully and reasonably. In particular, you agree not to:</p>
        <ul>
          <li>Use Otto for any unlawful purpose or in violation of any applicable law.</li>
          <li>Attempt to reverse-engineer, disrupt, or gain unauthorized access to Otto or its servers.</li>
          <li>Resell, redistribute, or misrepresent the service.</li>
          <li>Submit data you do not have the right to provide, or that infringes others&apos; rights.</li>
        </ul>

        <h2>2. Otto is not professional advice</h2>
        <p>
          Otto&apos;s briefs, nudges, forecasts and tips are <strong>general, non-prescriptive, and supportive</strong>{" "}
          in nature. They are <strong>not medical advice and not financial advice</strong>, and they are not a
          substitute for a qualified professional.
        </p>
        <p>
          Always consult a doctor, pharmacist, or licensed financial advisor before making health or money
          decisions. You are responsible for your own choices. Otto can help you stay organized, but it does
          not diagnose, prescribe, or guarantee any financial outcome.
        </p>

        <h2>3. Propose-and-confirm — you stay in control</h2>
        <p>
          Otto operates on a propose-and-confirm basis. It never silently changes your data, calendar, or
          finances. Every action Otto suggests requires your explicit confirmation, and you remain responsible
          for the choices you accept.
        </p>

        <h2>4. Subscriptions and billing</h2>
        <p>Otto offers the following tiers:</p>
        <ul>
          <li>
            <strong>Free</strong> — a genuinely useful organizer at no cost.
          </li>
          <li>
            <strong>Pro Monthly</strong> — <strong>₱99 / month</strong>.
          </li>
          <li>
            <strong>Pro Annual</strong> — <strong>₱599 / year</strong>.
          </li>
          <li>
            <strong>Lifetime</strong> — <strong>₱1,299</strong>, a single one-time payment.
          </li>
        </ul>
        <p>
          Payments, renewals, cancellations, and refunds for paid tiers are <strong>handled by the app store</strong>{" "}
          (for example, the Google Play Store or Apple App Store) under that store&apos;s terms. Subscriptions renew
          and can be cancelled through your app store account. Prices may change for future purchases; we will
          give notice of any changes where required.
        </p>

        <h2>5. No warranty</h2>
        <p>
          Otto is provided <strong>&quot;as is&quot; and &quot;as available,&quot;</strong> without warranties of any kind,
          whether express or implied, including any implied warranties of merchantability, fitness for a
          particular purpose, or non-infringement. We do not warrant that Otto will be uninterrupted,
          error-free, or that its suggestions will be accurate or suitable for your situation.
        </p>

        <h2>6. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, Broadheader will not be liable for any indirect, incidental,
          special, consequential, or punitive damages, or for any loss of data, profits, or goodwill, arising
          from your use of Otto. Where liability cannot be excluded, it is limited to the amount you paid for
          the service in the twelve months before the claim.
        </p>

        <h2>7. Governing law</h2>
        <p>
          These terms are governed by the laws of the <strong>Republic of the Philippines</strong>, without
          regard to its conflict-of-laws rules. Any disputes will be subject to the jurisdiction of the courts
          of the Philippines.
        </p>

        <h2>8. Changes to these terms</h2>
        <p>
          We may update these terms as Otto evolves. When we make material changes, we will update the
          effective date above and, where appropriate, notify you in the app. Continued use of Otto after a
          change means you accept the updated terms.
        </p>

        <h2>9. Contact</h2>
        <p>
          Questions about these terms? Contact us at{" "}
          <a href="mailto:tech@broadheader.com">tech@broadheader.com</a>.
        </p>

        <p className="legal__small">
          Broadheader · Manila, Philippines. This is a draft template and does not constitute legal advice.
        </p>

        <div className="legal__foot">
          <Link href="/">← Back to home</Link>
          <Link href="/privacy">Privacy Policy →</Link>
        </div>
      </main>
    </>
  );
}
