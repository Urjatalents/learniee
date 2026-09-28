"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export default function DemoForm() {
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qs = new URLSearchParams({
      child: String(fd.get("child") ?? "").trim(),
      grade: String(fd.get("grade") ?? ""),
    });
    router.push(`/signup?${qs.toString()}`);
  }

  return (
    <form className="dform" onSubmit={onSubmit}>
      <h3>Start with a free demo</h3>
      <label>
        Child&apos;s name
        <input name="child" required autoComplete="off" />
      </label>
      <label>
        Grade
        <select name="grade" required defaultValue="">
          <option value="">Select grade</option>
          <option>Prep–1st</option>
          <option>2nd–4th</option>
          <option>5th–7th</option>
          <option>8th–10th</option>
          <option>11th–12th</option>
        </select>
      </label>
      <button className="btn" type="submit">
        Book my free demo
      </button>
      <small>You&apos;ll create a parent account on the next step.</small>
    </form>
  );
}
