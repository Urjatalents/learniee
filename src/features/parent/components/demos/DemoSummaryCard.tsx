interface Props {
  upcoming: number;
  attended: number;
  total: number;
}

/** Right-hand "Summary" card: upcoming / attended / total booked. */
export default function DemoSummaryCard({ upcoming, attended, total }: Props) {
  return (
    <section aria-label="Demo summary" className="rounded-2xl border border-pd-line bg-white p-5">
      <div className="text-[13px] font-medium text-pd-ink2">Summary</div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="font-bold text-pd-ink3">Upcoming</dt>
        <dd className="text-right font-semibold">{upcoming}</dd>
        <dt className="font-bold text-pd-ink3">Attended</dt>
        <dd className="text-right font-semibold">{attended}</dd>
        <dt className="font-bold text-pd-ink3">Total booked</dt>
        <dd className="text-right font-semibold">{total}</dd>
      </dl>
    </section>
  );
}
