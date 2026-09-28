import Link from "next/link";
import CourseBrowser from "./CourseBrowser";
import DemoForm from "./DemoForm";
import FooterAsk from "./FooterAsk";
import LandingHeader from "./LandingHeader";
import { FOOTER_GROUPS } from "../data";
import "../styles/landing.css";

/**
 * Public home page ("/"). Static sections render on the server; only the
 * header (mobile menu + active-section highlight), course tabs and the two
 * small forms are client components.
 */
export default function LandingPage() {
  return (
    <div className="lh">
      <a className="skip" href="#main">
        Skip to content
      </a>

      <LandingHeader />

      <main id="main">
      <section className="hero">
        <div className="wrap">
          <div>
            <h1>Expert online teachers for every stage of learning.</h1>
            <p>Live one-to-one and small-group classes for ages 3 to 18, taught by teachers who pass a 3% selection bar. Clear per-class pricing and two free demos to begin.</p>
            <div className="cta">
              <Link className="btn" href="/signup">Book a free demo</Link>
              <a className="btn ghost" href="#courses">Browse classes</a>
            </div>
            <div className="stats">
              <div><b>150+</b><span>Teachers</span></div>
              <div><b>450+</b><span>Students</span></div>
              <div><b>150+</b><span>Topics</span></div>
            </div>
          </div>
          <div className="stage"><span className="chip c1">2 free demos</span><span className="chip c2">4.8 ★ from 450+ students</span>
          <div className="room" aria-label="Preview of a live class">
            <div className="screen">
              <div className="board"><small>Maths · Grade 5 · Fractions</small>½ + ¼ = <span className="frac">¾</span><br />Same bottom number first.</div>
              <div className="live">Live class</div>
              <div className="tile t1">Meenakshi</div><div className="tile t2">Aarav</div>
            </div>
            <div className="room-foot"><div><b>Abacus for Beginners</b><br /><span>1-to-1 · 45 minutes</span></div><span>4.8 ★</span></div>
          </div></div>
        </div>
      </section>
      <div className="trust"><div className="wrap"><span>Classes for</span><b>CBSE</b><b>ICSE</b><b>IGCSE</b><b>IB</b><b>JEE &amp; NEET</b><b>Olympiads</b><b>Hobbies</b></div></div>

      <section id="courses">
        <div className="wrap">
          <h2>Find a class that fits your child</h2>
          <p className="lede">Pick what you&apos;re looking for, then see teachers and prices. Every class starts with a free demo.</p>
          <CourseBrowser />
          <Link className="btn solid more" href="/courses">View all courses</Link>
        </div>
      </section>

      <section className="mentors" id="mentors">
        <div className="wrap">
          <h2>Meet your teachers</h2>
          <p className="lede">Only the top 3% of applicants make it through our interviews and demo classes. Here are a few of them.</p>
          <div className="mgrid">
            <article className="mentor"><div className="av" style={{ background: "var(--lav-200)" }}>C</div><span className="badge">Learniee recommended</span><h3>Cia Rodriguez</h3><div className="sub">IIT preparation · 4.7 ★ · 62 students</div><p>IIT Indore graduate, 2nd in her batch. Has taught at IIM Bangalore and IIT Bombay as visiting faculty.</p></article>
            <article className="mentor"><div className="av" style={{ background: "var(--sun)" }}>M</div><span className="badge">Learniee recommended</span><h3>Meenakshi Iyer</h3><div className="sub">Abacus and Vedic maths · 4.9 ★ · 88 students</div><p>Twelve years of teaching young learners. Known for building strong number sense in the first few weeks.</p></article>
            <article className="mentor"><div className="av" style={{ background: "var(--lav-400)" }}>S</div><span className="badge">Learniee recommended</span><h3>Sharad Menon</h3><div className="sub">MS Excel and careers · 4.8 ★ · 41 students</div><p>Ten years in analytics. Teaches working professionals practical spreadsheet skills, one project at a time.</p></article>
          </div>
        </div>
      </section>

      <section id="why">
        <div className="wrap">
          <h2>Why families choose Learniee</h2>
          <div className="why">
            <div className="wc" style={{ background: "var(--lav-200)" }}><span className="ico"><svg viewBox='0 0 24 24' width='26' height='26' fill='none' stroke='#241848' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><circle cx='12' cy='8' r='4'/><path d='M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8'/></svg></span><h3>Attention that&apos;s all theirs</h3><p>One-to-one guidance from an expert, with daily progress tracking so you always know where your child stands.</p></div>
            <div className="wc" style={{ background: "var(--sun)" }}><span className="ico"><svg viewBox='0 0 24 24' width='26' height='26' fill='none' stroke='#241848' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M6 4h12M6 9h12M9 4c5 0 7 2 7 5s-2 5-7 5l7 7'/></svg></span><h3>Clear prices, no surprises</h3><p>Pay per class with flexible monthly payments. Free demos first, and no hidden programme fees.</p></div>
            <div className="wc" style={{ background: "var(--lav-400)" }}><span className="ico"><svg viewBox='0 0 24 24' width='26' height='26' fill='none' stroke='#241848' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><rect x='3' y='4' width='18' height='13' rx='2'/><path d='M10 8.5l5 2.5-5 2.5zM8 21h8'/></svg></span><h3>Learning that&apos;s engaging</h3><p>Live classes with shared whiteboards, homework and feedback. Modern tools with real teachers behind them.</p></div>
            <div className="wc" style={{ background: "#fff" }}><span className="ico"><svg viewBox='0 0 24 24' width='26' height='26' fill='none' stroke='#241848' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 19.6l1.1-6L3.4 9.4l6-.8z'/></svg></span><h3>Your child sets the direction</h3><p>Choose from school subjects, hobbies and exam prep, and change course whenever their interests do.</p></div>
          </div>
        </div>
      </section>

      <section className="stories" id="stories">
        <div className="wrap">
          <h2>What parents tell us</h2>
          <div className="sgrid">
            <blockquote><div className="stars" aria-label="5 out of 5">★★★★★</div><p>My child learned Vedic Maths on their own schedule and reached their goals with ease. The teacher was engaging and the material was relevant.</p><footer><span className="dot">B</span><span><b>Bhakti Shah</b>Mumbai</span></footer></blockquote>
            <blockquote><div className="stars" aria-label="5 out of 5">★★★★★</div><p>I doubted online classes could match a classroom. The Abacus course proved me wrong. The foundation built for my child is so strong.</p><footer><span className="dot">V</span><span><b>Veronna Diaz</b>Toronto</span></footer></blockquote>
            <blockquote><div className="stars" aria-label="5 out of 5">★★★★★</div><p>I wanted to learn MS Excel but had no time for traditional classes. I learned at my own pace, and the teacher was excellent.</p><footer><span className="dot">M</span><span><b>Madhav Jha</b>Chennai</span></footer></blockquote>
          </div>
        </div>
      </section>

      <section id="how">
        <div className="wrap">
          <h2>How it works</h2>
          <ol className="steps">
            <li><h3>Sign up</h3><p>Create a parent account and add your child&apos;s details.</p></li>
            <li><h3>Try a free demo</h3><p>Book up to two free demos with the teachers you like.</p></li>
            <li><h3>Choose a schedule</h3><p>Pick weekdays and a time. Pay for the month, renew when you&apos;re ready.</p></li>
            <li><h3>Join the class</h3><p>Log in, tap Join, learn. Follow homework and progress in My Classes.</p></li>
          </ol>
        </div>
      </section>

      <section className="demo" id="demo">
        <div className="wrap">
          <div>
            <h2>Book a free demo class for your child</h2>
            <p className="lede">Meet a teacher, see the class, then decide. It takes two minutes.</p>
            <ul><li>Two free demos on every account</li><li>Live class with a real teacher</li><li>No card needed</li></ul>
          </div>
          <DemoForm />
        </div>
      </section>

      <section id="blog">
        <div className="wrap">
          <h2>Brain bites</h2>
          <p className="lede">Short reads on study habits, exams and raising curious kids.</p>
          <div className="bgrid">
            <article className="post"><div className="img" style={{ background: "var(--lav-400)" }}><svg viewBox='0 0 200 150' aria-hidden='true'><rect x='50' y='36' width='100' height='24' rx='4'/><rect x='62' y='64' width='90' height='24' rx='4'/><rect x='46' y='92' width='106' height='24' rx='4'/></svg></div><div className="b"><span className="tag">Competitive exams</span><h3>Top 10 books for JEE prep</h3><small>Sunny Dhiman · 6 Dec 2022</small></div></article>
            <article className="post"><div className="img" style={{ background: "var(--sun)" }}><svg viewBox='0 0 200 150' aria-hidden='true'><circle cx='100' cy='68' r='28'/><path d='M88 102h24M91 112h18M100 22v-8M60 32l-6-6M140 32l6-6'/></svg></div><div className="b"><span className="tag">Critical thinking</span><h3>How to teach your child to think critically</h3><small>Chandni Gupta · 6 Dec 2022</small></div></article>
            <article className="post"><div className="img" style={{ background: "var(--lav-200)" }}><svg viewBox='0 0 200 150' aria-hidden='true'><path d='M100 24l11 31 31 11-31 11-11 31-11-31-31-11 31-11z'/></svg></div><div className="b"><span className="tag">Self improvement</span><h3>4 daily habits to boost your memory</h3><small>Vikas Sharma · 6 Dec 2022</small></div></article>
          </div>
        </div>
      </section>

      <section id="faq" style={{ background: "#fff" }}>
        <div className="wrap">
          <h2>Questions parents ask</h2>
          <div className="faq" style={{ marginTop: "32px" }}>
            <details><summary>What is Learniee?</summary><p>Learniee is an online tuition platform. You choose a teacher and a schedule, and your child attends live classes from home.</p></details>
            <details><summary>How do free demos work?</summary><p>Every parent account gets two free demo classes. After that a demo costs ₹100, or you can buy demo coupons in bulk.</p></details>
            <details><summary>How does payment work?</summary><p>You pay one month at a time, based on the class days you choose. Renewal opens a week before the month ends.</p></details>
            <details><summary>What if a class is missed or cancelled?</summary><p>If the teacher misses a class, we schedule a make-up. You&apos;ll have 48 hours after each class to confirm it or report a problem.</p></details>
          </div>
        </div>
      </section>

      <section className="close" id="help">
        <div className="wrap">
          <h2>Try a class before you decide</h2>
          <p>Two free demos, no card needed.</p>
          <Link className="btn" href="/signup">Book a free demo</Link>
        </div>
      </section>
      </main>

      <footer className="site">
        <div className="wrap">
          <div className="ftop">
            <Link className="logo" href="/">
              <i />
              Learniee
            </Link>
            <p>
              Live online tuition for ages 3 to 18, with hand-picked teachers and
              fair prices.
            </p>
            <FooterAsk />
          </div>
          {FOOTER_GROUPS.map((group) => (
            <nav className="fmega" aria-label={group.label} key={group.label}>
              {group.columns.map((col) => (
                <div key={col.title}>
                  <h4>{col.title}</h4>
                  <ul>
                    {col.links.map((l) => (
                      <li key={l.href + l.label}>
                        {/* prefetch off: ~100 links, most pages not built yet */}
                        <Link href={l.href} prefetch={false}>
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          ))}
          <div className="legal">
            <span>&copy; 2026 Learniee. All rights reserved.</span>
            <span>English · INR · India (IST)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
