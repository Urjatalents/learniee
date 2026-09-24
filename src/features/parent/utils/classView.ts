/**
 * Which enrollments use the new My Classes page (Part 2C) and which
 * keep their old view.
 *
 * New page: cycle-model enrollments (`isLegacy = false`) that have
 * been activated (ACTIVE) or have ended (COMPLETED) — those are the
 * ones with cycles and sessions to show.
 *
 * Old view: every legacy enrollment (created before the cycle
 * model), and any cycle-model enrollment that is not active yet
 * (waiting for approval, needs the parent's reconfirmation,
 * rejected, cancelled) — the existing status card handles those.
 */
const CLASS_VIEW_STATUSES = new Set(["ACTIVE", "COMPLETED"]);

export function usesClassView(enrollment: { isLegacy: boolean; status: string }): boolean {
  return !enrollment.isLegacy && CLASS_VIEW_STATUSES.has(enrollment.status);
}

/** Tabs of the class detail page. */
export type ClassTab = "classes" | "homework" | "resources" | "chat";

export function parseClassTab(value: string | string[] | undefined): ClassTab {
  const tab = Array.isArray(value) ? value[0] : value;

  return tab === "homework" || tab === "resources" || tab === "chat" ? tab : "classes";
}
