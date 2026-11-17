"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { BTN_PRI, BTN_SEC, Section, Tag } from "./HomeBits";
import type { AttentionItem } from "./homeLogic";

export default function AttentionList({ items }: { items: AttentionItem[] }) {
  const [showAll, setShowAll] = useState(false);

  if (!items.length) {
    return (
      <p className="mx-0.5 -my-1 flex items-center gap-2 text-[13px] text-pd-ink3">
        <Check size={16} strokeWidth={2.5} className="text-pd-green" />
        Nothing needs your attention right now
      </p>
    );
  }

  const shown = showAll ? items : items.slice(0, 3);

  return (
    <Section
      id="home-attention"
      title={
        <span className="flex items-center gap-2">
          Needs your attention <Tag tone="amber">{items.length}</Tag>
        </span>
      }
    >
      <div className="overflow-hidden rounded-[14px] border border-pd-line bg-white">
        {shown.map((x, i) => {
          const hot = i === 0;
          return (
            <div
              key={x.key}
              className={`flex flex-wrap items-center justify-between gap-3 ${
                i > 0 ? "border-t border-pd-line" : ""
              } ${hot ? "border-l-4 border-l-[#d97706] bg-[#fff6e0] p-4" : "px-4 py-3"}`}
            >
              <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1">
                <b
                  className={`font-heading font-semibold leading-[1.3] text-pd-ink ${
                    hot ? "text-[20px]" : "text-[17px]"
                  }`}
                >
                  {x.title}
                </b>
                <small className="text-[13px] leading-normal text-pd-ink3 max-[600px]:whitespace-normal sm:truncate">
                  {x.sub}
                </small>
              </div>
              <Link href={x.href} className={`${x.primary ? BTN_PRI : BTN_SEC} shrink-0`}>
                {x.button}
              </Link>
            </div>
          );
        })}
      </div>

      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2.5 inline-flex rounded-lg px-2 py-1 text-[13px] font-semibold text-pd-brand hover:bg-pd-b50"
        >
          {showAll ? "Show less" : `Show ${items.length - 3} more`}
        </button>
      )}
    </Section>
  );
}
