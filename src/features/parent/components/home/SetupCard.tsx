import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ProgressRing } from "./HomeBits";
import type { HomeData } from "./homeTypes";

export default function SetupCard({ data }: { data: HomeData }) {
  const steps = [
    { title: "Add your child", done: data.kids.length > 0, href: "/parent/students" },
    {
      title: "Book a free demo",
      done: data.sessions.some((s) => s.kind === "demo") || data.classes.length > 0,
      href: "/parent/courses",
    },
    { title: "Set your preferences", done: false, href: "/parent/account" },
  ];

  const left = steps.filter((s) => !s.done);
  if (!left.length) return null;

  const doneCount = steps.length - left.length;
  const next = left[0];

  return (
    <Link
      href={next.href}
      className="flex w-full items-center gap-3 rounded-[14px] border border-pd-line bg-white px-3.5 py-3 text-left hover:border-pd-line2"
    >
      <ProgressRing percent={Math.round((doneCount / steps.length) * 100)} size={40} />
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="text-sm font-semibold">{next.title}</b>
        <small className="text-xs text-pd-ink3">
          {doneCount} of {steps.length} steps done
        </small>
      </span>
      <ChevronRight size={18} className="text-pd-ink3" />
    </Link>
  );
}
