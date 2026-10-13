export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="font-heading text-lg font-bold text-brand-dark mb-4 border-b border-admin-line-soft pb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{children}</div>
    </div>
  );
}

export function InfoField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">{label}</p>
      <p className="text-admin-ink font-bold mt-1 break-words">
        {value !== null && value !== undefined && value !== "" ? value : "Not provided"}
      </p>
    </div>
  );
}
