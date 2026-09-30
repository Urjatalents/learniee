import Link from "next/link";
import LandingFooter from "./LandingFooter";
import LandingHeader from "./LandingHeader";
import "../styles/landing.css";

// Keep in sync with DEFAULT_REWARD_AMOUNT in
// src/features/shared/server/referral.service.ts (the amount actually paid).
const REWARD = "₹500";

const STEPS = [
  {
    title: "Sign up",
    text: "Create a free parent account. Your personal referral code is ready in your dashboard under Refer & Earn.",
  },
  {
    title: "Share your code",
    text: "Send it to anyone looking for quality 1-on-1 or small-group online classes. There is no limit on how many people you can refer.",
  },
  {
    title: "Your friend enrolls",
    text: "They enter your code while signing up, then enroll and pay for a course.",
  },
  {
    title: `You earn ${REWARD}`,
    text: "The moment their enrollment goes through, the reward lands in your Learniee Wallet automatically.",
  },
] as const;

const GOOD_TO_KNOW = [
  {
    bg: "var(--lav-200)",
    title: `${REWARD} per referral`,
    text: "Every friend who successfully enrolls in a course earns you a reward.",
  },
  {
    bg: "var(--sun)",
    title: "Paid on enrollment",
    text: "The reward is paid once your friend enrolls, not just for signing up with a code.",
  },
  {
    bg: "var(--lav-400)",
    title: "Straight to your Wallet",
    text: "Rewards are credited to your Learniee Wallet, not your original payment method. Every credit is listed there.",
  },
  {
    bg: "#fff",
    title: "No limit",
    text: "Refer as many people as you like. Track each referral from your dashboard.",
  },
] as const;

const FAQ = [
  {
    q: "How do I get my referral code?",
    a: "Sign up for a free parent account. Your code appears under Refer & Earn in your dashboard, with a copy button and a WhatsApp share option.",
  },
  {
    q: "When do I receive the reward?",
    a: `Only after the person you referred successfully enrolls in a course. Then ${REWARD} is credited to your Wallet automatically, with no need to contact support.`,
  },
  {
    q: "Where does my friend enter the code?",
    a: "During sign-up, in the onboarding form right after they create their account.",
  },
  {
    q: "Is there a limit on referrals?",
    a: "No. You can refer as many people as you like.",
  },
] as const;

/** Public Refer & Earn page ("/referral"). Static, rendered on the server. */
export default function ReferralPage() {
  return (
    <div className="lh">
      <a className="skip" href="#main">
        Skip to content
      </a>

      <LandingHeader />

      <main id="main">
        <section className="pagehead">
          <div className="wrap">
            <h1>Share learning. Earn rewards.</h1>
            <p className="lede">
              Refer a friend to Learniee and earn {REWARD} in your Wallet when
              they enroll in a course. To get your referral code and receive
              rewards, you need a Learniee parent account.
            </p>
            <div className="cta" style={{ marginTop: "28px" }}>
              <Link className="btn" href="/signup">
                Sign up to get your code
              </Link>
              <Link className="btn ghost" href="/login">
                Log in
              </Link>
            </div>
          </div>
        </section>

        <section id="how">
          <div className="wrap">
            <h2>How it works</h2>
            <ol className="steps">
              {STEPS.map((s) => (
                <li key={s.title}>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="why">
          <div className="wrap">
            <h2>Good to know</h2>
            <div className="why">
              {GOOD_TO_KNOW.map((g) => (
                <div className="wc" style={{ background: g.bg }} key={g.title}>
                  <h3>{g.title}</h3>
                  <p>{g.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" style={{ background: "#fff" }}>
          <div className="wrap">
            <h2>Referral questions</h2>
            <div className="faq" style={{ marginTop: "32px" }}>
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="close">
          <div className="wrap">
            <h2>Ready to start earning?</h2>
            <p>
              Create your account to get your code. Already have one?{" "}
              <Link href="/login" style={{ textDecoration: "underline" }}>
                Log in
              </Link>
            </p>
            <Link className="btn" href="/signup">
              Sign up free
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
