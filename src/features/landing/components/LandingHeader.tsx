"use client";

import Link from "next/link";
import BrandLogo from "@/features/shared/components/BrandLogo";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// `id` = section on the home page (linked as /#id so it also works from /blog);
// `href` = a separate page.
const NAV = [
  { id: "courses", label: "Courses" },
  { id: "mentors", label: "Teachers" },
  { id: "how", label: "How it works" },
  { id: "stories", label: "Stories" },
  { href: "/blog", label: "Blog" },
  { id: "faq", label: "FAQ" },
  { id: "help", label: "Help" },
] as const;

const SECTION_IDS = NAV.flatMap((n) => ("id" in n ? [n.id] : []));

export default function LandingHeader() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Smooth anchor scrolling on this page only (restored on unmount so the
  // rest of the app is unaffected).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = reduce ? "auto" : "smooth";
    return () => {
      root.style.scrollBehavior = prev;
    };
  }, []);

  // Highlight the nav link of the section in the middle of the viewport.
  useEffect(() => {
    if (!onHome || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [onHome]);

  // Escape or a click/tap outside the header closes the mobile menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <header>
      <div className="wrap nav" ref={navRef}>
        <Link className="logo" href="/">
          <BrandLogo className="h-10 w-auto" priority />
        </Link>
        <nav className={open ? "links open" : "links"} id="links" aria-label="Main">
          {NAV.map((n) => {
            if ("href" in n) {
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={pathname.startsWith(n.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {n.label}
                </Link>
              );
            }
            return (
              <Link
                key={n.id}
                href={`/#${n.id}`}
                aria-current={onHome && active === n.id ? "true" : undefined}
                onClick={() => setOpen(false)}
              >
                {n.label}
              </Link>
            );
          })}
          <Link className="btn ghost mob" href="/login">
            Log in
          </Link>
          <Link className="btn mob" href="/signup">
            Book a free demo
          </Link>
        </nav>
        <Link className="btn ghost" href="/login">
          Log in
        </Link>
        <Link className="btn" href="/signup">
          Book a free demo
        </Link>
        <button
          type="button"
          className="menu"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="links"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
    </header>
  );
}
