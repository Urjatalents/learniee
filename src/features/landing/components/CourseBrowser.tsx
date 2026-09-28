"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { COURSES_HREF, COURSE_TABS } from "../data";

const KEYS = Object.keys(COURSE_TABS);

export default function CourseBrowser() {
  const [selected, setSelected] = useState(KEYS[0]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // WAI-ARIA tabs: arrow keys / Home / End move between tabs.
  function onKeyDown(e: KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % KEYS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + KEYS.length) % KEYS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = KEYS.length - 1;
    else return;
    e.preventDefault();
    setSelected(KEYS[next]);
    tabRefs.current[next]?.focus();
  }

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Class type">
        {KEYS.map((k, i) => (
          <button
            key={k}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${i}`}
            aria-controls="courseList"
            className="tab"
            aria-selected={k === selected}
            tabIndex={k === selected ? 0 : -1}
            onClick={() => setSelected(k)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {k}
          </button>
        ))}
      </div>
      <div
        className="courses"
        id="courseList"
        role="tabpanel"
        aria-labelledby={`tab-${KEYS.indexOf(selected)}`}
      >
        {COURSE_TABS[selected].map((c) => (
          <Link className="course" href={COURSES_HREF} key={c.title} prefetch={false}>
            <div className="thumb" style={{ background: c.bg }}>
              <span aria-hidden="true">{c.symbol}</span>
            </div>
            <div className="b">
              <h3>{c.title}</h3>
              <span className="meta">{c.meta}</span>
              <div className="row">
                <span className="rate">{c.rate} per class</span>
                <span>Book demo</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
