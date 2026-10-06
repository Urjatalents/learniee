/**
 * Which Workspace organizer account should own the next Meet room.
 * Pure logic (no database, no Google calls) so it is easy to reason
 * about and test. `sessionMeeting.service.ts` feeds it the facts.
 *
 * Rules:
 *  1. An account that is FREE (owns no room whose class overlaps the new
 *     class) beats one that is busy.
 *  2. Among accounts of the same kind, the LEAST RECENTLY USED goes
 *     first (an account that was never used counts as the oldest).
 *  3. Still tied: the configured order (primary account first).
 *
 * The result is the full preference list, so the caller can fall over
 * to the next account if Google refuses the first one. When every
 * account is busy the list is simply least-recently-used first.
 */

export interface RankOrganizersInput {
  /** Configured organizers, primary first (lower-cased). */
  organizers: readonly string[];
  /** Organizers that already own an overlapping room. */
  busy: ReadonlySet<string>;
  /** Epoch ms of each organizer's newest allocation; missing = never used. */
  lastUsedMs: ReadonlyMap<string, number>;
}

export function rankOrganizers({ organizers, busy, lastUsedMs }: RankOrganizersInput): string[] {
  const position = new Map(organizers.map((email, index) => [email, index] as const));

  const leastRecentlyUsed = (a: string, b: string) =>
    (lastUsedMs.get(a) ?? 0) - (lastUsedMs.get(b) ?? 0) ||
    (position.get(a) ?? 0) - (position.get(b) ?? 0);

  const free = organizers.filter((email) => !busy.has(email)).sort(leastRecentlyUsed);
  const inUse = organizers.filter((email) => busy.has(email)).sort(leastRecentlyUsed);

  return [...free, ...inUse];
}
