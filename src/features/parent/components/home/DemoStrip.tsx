import Link from "next/link";
import { Lock, Video } from "lucide-react";

import { BTN_PRI } from "./HomeBits";
import { countdown, inKid, isLive, whenLabel, type LearnerFilter } from "./homeLogic";
import type { HomeData, HomeSession } from "./homeTypes";

interface Props {
  data: HomeData;
  filter: LearnerFilter;
  now: Date;
  /** The session already shown in the hero (so we don't repeat it). */
  heroSession: HomeSession | undefined;
}

/** Compact line for the next demo when it isn't the hero. */
export default function DemoStrip({ data, filter, now, heroSession }: Props) {
  const demos = data.sessions
    .filter((s) => s.kind === "demo" && s.status === "confirmed" && inKid(filter, s.kidId) && isLive(s, now))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const next = demos[0];
  if (!next || heroSession?.id === next.id) return null;

  const cd = countdown(next.start, now);
  const kid = data.kids.find((k) => k.id === next.kidId);
  const more = demos.length - 1;
  const canJoin = cd.open && next.hasLink;

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-pd-line bg-white px-3.5 py-2.5 transition-colors hover:border-pd-line2">
      <Link
        href="/parent/my-classes?tab=demos"
        aria-label="Open demos"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-pd-b50 text-pd-brand">
          <Video size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="truncate text-sm font-medium">Demo: {next.title}</b>
          <small className="truncate text-xs font-bold text-pd-ink2">
            {kid?.first} ·{" "}
            {cd.open ? (next.hasLink ? cd.text : "Link not ready yet") : whenLabel(next.start, now)}
            {more > 0 ? ` · +${more} more` : ""}
          </small>
        </span>
      </Link>

      {canJoin ? (
        <Link href="/parent/my-classes?tab=demos" className={`${BTN_PRI} shrink-0`}>
          <Video size={16} />
          Join demo
        </Link>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Opens 10 minutes before the demo"
          className={`${BTN_PRI} shrink-0 !bg-pd-b100 !text-pd-brand-d !opacity-75`}
        >
          <Lock size={14} />
          Join demo
        </button>
      )}
    </div>
  );
}
