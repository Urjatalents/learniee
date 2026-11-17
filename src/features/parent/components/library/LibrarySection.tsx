import type { ReactNode } from "react";

/** "Resources 3" style section heading used on the Library page. */
export default function LibrarySection({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-6">
      <h2 id={id} className="mb-3 font-heading text-[19px] font-semibold text-pd-ink">
        {title} <span className="text-xs font-medium text-pd-ink3">{count}</span>
      </h2>
      {children}
    </section>
  );
}
