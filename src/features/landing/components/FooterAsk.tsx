"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export default function FooterAsk() {
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    router.push(`/courses?q=${encodeURIComponent(q)}`);
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
