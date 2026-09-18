export interface PieChartSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  slices: PieChartSlice[];
  /** Center label, e.g. a formatted total — shown in the donut hole. */
  centerLabel?: string;
  centerSubLabel?: string;
  size?: number;
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Plain SVG donut chart — no charting library dependency. Draws each
 * slice as an arc path around a viewBox of size 100x100 so it scales
 * responsively via the `size` prop / container width. Zero-value or
 * all-zero data renders an empty gray ring with a "No data yet"
 * center label instead of throwing on a divide-by-zero angle.
 */
export default function PieChart({ slices, centerLabel, centerSubLabel, size = 200 }: PieChartProps) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const radius = 40;
  const innerRadius = 25;
  const cx = 50;
  const cy = 50;

  const positiveSlices = slices.filter((s) => s.value > 0);

  function arcPath(startAngle: number, endAngle: number) {
    const toXY = (r: number, angleDeg: number) => {
      const rad = ((angleDeg - 90) * Math.PI) / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    };

    const [x1, y1] = toXY(radius, startAngle);
    const [x2, y2] = toXY(radius, endAngle);
    const [x3, y3] = toXY(innerRadius, endAngle);
    const [x4, y4] = toXY(innerRadius, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      "Z",
    ].join(" ");
  }

  let cursor = 0;
  const paths =
    total > 0
      ? positiveSlices.map((s) => {
          const sweep = (s.value / total) * 360;
          const path = arcPath(cursor, cursor + sweep);
          cursor += sweep;
          return { ...s, path };
        })
      : [];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div style={{ width: size, height: size }} className="shrink-0 relative">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {total > 0 ? (
            paths.map((s) => (
              <path key={s.label} d={s.path} fill={s.color}>
                <title>{`${s.label}: ${currency.format(s.value)}`}</title>
              </path>
            ))
          ) : (
            <circle cx={cx} cy={cy} r={(radius + innerRadius) / 2} fill="none" stroke="#e5e7eb" strokeWidth={radius - innerRadius} />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-sm sm:text-base font-bold text-gray-800 leading-tight">
            {total > 0 ? centerLabel ?? currency.format(total) : "No data yet"}
          </span>
          {centerSubLabel && total > 0 && (
            <span className="text-[11px] text-gray-400 mt-0.5">{centerSubLabel}</span>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-2 text-sm w-full sm:w-auto">
        {slices.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 1000) / 10 : 0;
          return (
            <li key={s.label} className="flex items-center justify-between gap-4 min-w-[220px]">
              <span className="flex items-center gap-2 text-gray-600">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
              <span className="font-medium text-gray-800 text-right">
                {currency.format(s.value)}
                <span className="text-gray-400 font-normal ml-1">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
