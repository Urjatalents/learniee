/**
 * Teacher application cooldown + appeal rules (Oct 7, 2026).
 * Pure helpers — safe on server and client. Override the length with
 * TEACHER_REAPPLY_COOLDOWN_DAYS (server env only; the client only ever
 * receives the computed date from the API).
 */

const DEFAULT_COOLDOWN_DAYS = 30;

export function getReapplyCooldownDays(): number {
  const raw = Number(process.env.TEACHER_REAPPLY_COOLDOWN_DAYS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_COOLDOWN_DAYS;
}

export function computeReapplyAvailableAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + getReapplyCooldownDays() * 24 * 60 * 60 * 1000);
}

/** A rejected Teacher may appeal once the cooldown date has passed (no date = open). */
export function isAppealOpen(
  reapplyAvailableAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!reapplyAvailableAt) return true;
  return new Date(reapplyAvailableAt).getTime() <= now.getTime();
}
