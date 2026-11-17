import Link from "next/link";

import { NeutralAvatar } from "./HomeBits";
import { inKid, shortSubject, type LearnerFilter } from "./homeLogic";
import type { HomeData } from "./homeTypes";

export default function MessagesCard({ data, filter }: { data: HomeData; filter: LearnerFilter }) {
  const chats = data.chats.filter((c) => inKid(filter, c.kidId)).slice(0, 3);
  if (!chats.length) return null;

  return (
    <section aria-labelledby="home-msgs" className="rounded-[18px] border border-pd-line bg-white px-2 pb-2 pt-4">
      <h2
        id="home-msgs"
        className="flex items-center justify-between px-2.5 pb-1.5 font-heading text-[15px] font-semibold"
      >
        Messages
        <Link
          href="/parent/chat"
          className="rounded-lg px-2 py-1 font-sans text-[13px] font-semibold text-pd-brand hover:bg-pd-b50"
        >
          All
        </Link>
      </h2>
      <ul>
        {chats.map((c) => {
          const kid = data.kids.find((k) => k.id === c.kidId);
          return (
            <li key={c.id}>
              <Link
                href="/parent/chat"
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-pd-bg"
              >
                <NeutralAvatar name={c.teacherName} />
                <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
                  <b className="truncate text-sm font-semibold">{c.teacherName}</b>
                  <small className="truncate text-xs text-pd-ink3">
                    {shortSubject(c.subject)} · {kid?.first}
                  </small>
                </span>
                <span className="text-xs text-pd-ink3">{c.last}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
