/** Design `ring(pct, size)`: small percentage ring in the brand colour. */
export default function PdRing({ percent, size = 52 }: { percent: number; size?: number }) {
  const r = (size - 7) / 2;
  const c = 2 * Math.PI * r;
  const h = size / 2;
  const p = Math.min(100, Math.max(0, percent));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="shrink-0">
      <circle cx={h} cy={h} r={r} fill="none" stroke="var(--color-pd-b100)" strokeWidth={5} />
      <circle
        cx={h}
        cy={h}
        r={r}
        fill="none"
        stroke="var(--color-pd-brand)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${(c * p) / 100} ${c}`}
        transform={`rotate(-90 ${h} ${h})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
        fill="currentColor"
      >
        {Math.round(p)}%
      </text>
    </svg>
  );
}
