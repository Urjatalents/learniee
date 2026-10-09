"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export default function CatalogSearch({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim().slice(0, 100);
    router.push(q ? `/courses?q=${encodeURIComponent(q)}` : "/courses");
  }

  return (
    <form className="cat-search" onSubmit={onSubmit} role="search">
      <input
        name="q"
        defaultValue={defaultValue}
        maxLength={100}
        placeholder="Search classes, subjects or teachers"
        aria-label="Search classes"
      />
      <button type="submit" className="btn solid">
        Search
      </button>
    </form>
  );
}
