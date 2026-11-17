import type {
  HomeClass,
  HomeData,
  HomeKid,
  HomeRecommendation,
  HomeSession,
} from "./homeTypes";

export type LearnerFilter = "all" | string;

export const KID_PALETTE = ["#0f766e", "#c2410c", "#be185d", "#1d4ed8", "#4d7c0f", "#a16207"];

/** One colour per learner — the only categorical colour on the page. */
export function kidColor(kids: HomeKid[], kidId: string): string | null {
  const i = kids.findIndex((k) => k.id === kidId);
  return i >= 0 ? KID_PALETTE[i % KID_PALETTE.length] : null;
}

export const SUBJECT_COLOR: Record<string, string> = {
  Mathematics: "#5931a2",
  English: "#be185d",
  Chemistry: "#0f766e",
  Physics: "#1d4ed8",
  Biology: "#4d7c0f",
  Hindi: "#b45309",
  "Computer Science": "#475569",
};

const SUBJECT_SHORT: Record<string, string> = {
  Mathematics: "Maths",
  Chemistry: "Chem",
  Physics: "Phys",
  Biology: "Bio",
  "Computer Science": "CS",
};

export const shortSubject = (s: string) => SUBJECT_SHORT[s] ?? s;

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export const fmtTime = (d: Date) =>
  d
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    .toUpperCase();

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function dayDiff(d: Date, now: Date): number {
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(d);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 864e5);
}

export function dayLabel(d: Date, now: Date): string {
  const n = dayDiff(d, now);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export const whenLabel = (d: Date, now: Date) => `${dayLabel(d, now)}, ${fmtTime(d)}`;

export const inKid = (filter: LearnerFilter, kidId: string) =>
  filter === "all" || kidId === filter;

export const isLive = (s: HomeSession, now: Date) => s.end.getTime() > now.getTime();

export const gradeLabel = (k: { grade: number | null }) => (k.grade ? `Gr ${k.grade}` : "");

export function upcomingSessions(data: HomeData, filter: LearnerFilter, now: Date) {
  return data.sessions
    .filter((s) => inKid(filter, s.kidId) && isLive(s, now))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export interface Countdown {
  text: string;
  /** Join opens 10 minutes before the start. */
  open: boolean;
  live: boolean;
}

export function countdown(start: Date, now: Date): Countdown {
  const ms = start.getTime() - now.getTime();
  if (ms <= 0) return { text: "In progress", open: true, live: true };

  const mins = Math.ceil(ms / 6e4);
  const open = ms <= 10 * 6e4;

  let text: string;
  if (open) {
    text = `Starts in ${mins} min`;
  } else if (dayDiff(start, now) === 0) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    text = `Starts in ${h ? h + "h " : ""}${m}m`;
  } else {
    text = `${dayLabel(start, now)} · ${fmtTime(start)}`;
  }
  return { text, open, live: false };
}

export interface AttentionItem {
  key: string;
  priority: number;
  days?: number;
  title: string;
  sub: string;
  button: string;
  href: string;
  primary?: boolean;
}

export function attentionItems(data: HomeData, filter: LearnerFilter): AttentionItem[] {
  return data.attention
    .filter((a) => a.kidId === null || inKid(filter, a.kidId))
    .map((a) => ({
      key: a.key,
      priority: a.priority,
      days: a.days ?? undefined,
      title: a.title,
      sub: a.sub,
      button: a.button,
      href: a.href,
      primary: a.priority === 1,
    }))
    .sort((x, y) => x.priority - y.priority || (x.days ?? 99) - (y.days ?? 99));
}

export const renewalsDue = (data: HomeData): HomeClass[] =>
  data.classes
    .filter((c) => c.status === "enrolled" && c.left !== null && c.left <= 14)
    .sort((a, b) => (a.left ?? 0) - (b.left ?? 0));

export interface Recommendation {
  rec: HomeRecommendation;
  kid: HomeKid;
}

/** Round-robin across learners so "All" shows a mix (the server ranks each learner's list). */
export function pickRecommendations(
  data: HomeData,
  filter: LearnerFilter,
  limit = 3,
): Recommendation[] {
  const kids = data.kids.filter((k) => filter === "all" || k.id === filter);
  const lists = kids.map((kid) => ({
    kid,
    recs: data.recommendations.filter((r) => r.kidId === kid.id),
  }));
  const used = new Set<string>();
  const out: Recommendation[] = [];

  for (let i = 0; out.length < limit && i < 8; i++) {
    for (const { kid, recs } of lists) {
      if (out.length >= limit) break;
      const rec = recs.find((x) => !used.has(x.courseId));
      if (rec) {
        used.add(rec.courseId);
        out.push({ rec, kid });
      }
    }
  }
  return out;
}
