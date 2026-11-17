"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { kcStyle } from "./HomeBits";
import { gradeLabel, kidColor, type LearnerFilter } from "./homeLogic";
import type { HomeKid } from "./homeTypes";

interface Props {
  kids: HomeKid[];
  active: LearnerFilter;
  onSelect: (id: LearnerFilter) => void;
}

const chip =
  "flex h-11 shrink-0 items-center gap-2 rounded-full border text-sm font-semibold transition-colors";

export default function HomeLearnerSwitcher({ kids, active, onSelect }: Props) {
  return (
    <div
      role="group"
      aria-label="Choose a learner"
      className="mt-4 flex items-center gap-2 overflow-x-auto p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        aria-pressed={active === "all"}
        onClick={() => onSelect("all")}
        className={`${chip} px-4 ${
          active === "all"
            ? "border-pd-brand bg-pd-brand text-white"
            : "border-pd-line bg-white text-pd-ink2 hover:border-pd-brand"
        }`}
      >
        All
      </button>

      {kids.map((k) => {
        const on = active === k.id;
        return (
          <button
            key={k.id}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(k.id)}
            className={`${chip} pl-1.5 pr-4 ${
              on
                ? "border-pd-brand bg-pd-brand text-white"
                : "border-pd-line bg-white text-pd-ink2 hover:border-pd-brand"
            }`}
          >
            <span
              style={kcStyle(kidColor(kids, k.id))}
              className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ${
                on ? "bg-white/25" : "bg-(--kc)"
              }`}
            >
              {k.first[0]}
            </span>
            {k.first}{" "}
            <small className={`font-semibold ${on ? "text-white/80" : "text-pd-ink3"}`}>
              {gradeLabel(k)}
            </small>
          </button>
        );
      })}

      <Link
        href="/parent/students"
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-pd-brand hover:bg-pd-b50"
      >
        <Plus size={16} />
        Add learner
      </Link>
    </div>
  );
}
