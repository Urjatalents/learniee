"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { COURSES_HREF } from "../data";

export default function FooterAsk() {
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    router.push(`${COURSES_HREF}?q=${encodeURIComponent(q)}`);
  }

  return (
    <form className="ask" onSubmit={onSubmit}>
      <input
        name="q"
        placeholder="Can't find a course?"
        aria-label="Tell us what you're looking for"
      />
      <button type="submit">Ask us</button>
    </form>
  );
}
