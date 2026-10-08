/** `YYYY-MM-DD` (UTC) for a date. */
export const iso = (d: Date) => d.toISOString().slice(0, 10);
