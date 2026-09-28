"use client";

import Link from "next/link";
import { useState } from "react";
import { COURSE_TABS } from "../data";

const KEYS = Object.keys(COURSE_TABS);

export default function CourseBrowser() {
  const [selected, setSelected] = useState(KEYS[0]);

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Class type">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            className="tab"
            aria-selected={k === selected}
            onClick={() => setSelected(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="courses" id="courseList" aria-live="polite">
        {COURSE_TABS[selected].map((c) => (
          <Link className="course" href="/courses" key={c.title} prefetch={false}>
            <div className="thumb" style={{ background: c.bg }}>
              <span>{c.symbol}</span>
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
