import Link from "next/link";

export default function CloseCta() {
  return (
  <section className="close" id="help">
    <div className="wrap">
      <h2>Try a class before you decide</h2>
      <p>Two free demos, no card needed.</p>
      <Link className="btn" href="/signup">Book a free demo</Link>
    </div>
  </section>
  );
}
