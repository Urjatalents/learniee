import Link from "next/link";
import BrandLogo from "@/features/shared/components/BrandLogo";
import FooterAsk from "./FooterAsk";
import { FOOTER_GROUPS } from "../data";

export default function LandingFooter() {
  return (
    <>
  <footer className="site">
    <div className="wrap">
      <div className="ftop">
        <Link className="logo" href="/">
          <BrandLogo variant="white" className="h-10 w-auto" />
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
    </>
  );
}
