import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ProgressRing } from "./HomeBits";
import type { HomeData } from "./homeTypes";

export default function SetupCard({ data }: { data: HomeData }) {
  const setup = data.setup;
  if (!setup) return null;

  return (
    <Link
      href={setup.href}
      className="flex w-full items-center gap-3 rounded-[14px] border border-pd-line bg-white px-3.5 py-3 text-left hover:border-pd-line2"
    >
      <ProgressRing percent={Math.round((setup.done / setup.total) * 100)} size={40} />
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="text-sm font-semibold">{setup.nextLabel}</b>
        <small className="text-xs text-pd-ink3">
          {setup.done} of {setup.total} steps done
        </small>
      </span>
      <ChevronRight size={18} className="text-pd-ink3" />
    </Link>
  );
}
