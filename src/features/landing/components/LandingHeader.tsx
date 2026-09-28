"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "courses", label: "Courses" },
  { id: "mentors", label: "Teachers" },
  { id: "how", label: "How it works" },
  { id: "stories", label: "Stories" },
  { id: "faq", label: "FAQ" },
  { id: "help", label: "Help" },
] as const;

export default function LandingHeader() {
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
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

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
          <i />
          Learniee
        </Link>
        <nav className={open ? "links open" : "links"} id="links" aria-label="Main">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
              onClick={() => setOpen(false)}
            >
              {s.label}
            </a>
          ))}
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
