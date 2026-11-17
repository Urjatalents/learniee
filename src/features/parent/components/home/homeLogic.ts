import type {
  HomeClass,
  HomeCourse,
  HomeData,
  HomeKid,
  HomeSession,
} from "./homeTypes";

export type LearnerFilter = "all" | string;

export const SESSION_LIVE_MINUTES = 45;

const KID_PALETTE = ["#0f766e", "#c2410c", "#be185d", "#1d4ed8", "#4d7c0f", "#a16207"];

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

export const isLive = (s: HomeSession, now: Date) =>
  s.start.getTime() + SESSION_LIVE_MINUTES * 6e4 > now.getTime();

export function upcomingSessions(data: HomeData, filter: LearnerFilter, now: Date) {
  return data.sessions
    .filter((s) => inKid(filter, s.kidId) && s.status === "confirmed" && isLive(s, now))
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
  const kidName = (id: string) => data.kids.find((k) => k.id === id)?.first ?? "";
  const items: AttentionItem[] = [];

  data.classes
    .filter((c) => c.status === "enrolled" && c.left <= 5 && inKid(filter, c.kidId) && !c.renewed)
    .forEach((c) => {
      const gap = c.price * c.total - data.walletBalance;
      items.push({
        key: `renew-${c.id}`,
        priority: 2,
        days: c.left,
        title: `Renew ${kidName(c.kidId)}’s ${c.subject} class`,
        sub:
          gap > 0
            ? `Ends in ${c.left} day${c.left === 1 ? "" : "s"}. Your wallet is ${inr(gap)} short.`
            : `Ends in ${c.left} day${c.left === 1 ? "" : "s"} — renew to keep the same weekly slots.`,
        button: "Renew",
        href: "/parent/my-classes",
      });
    });

  data.rescheduleAsks
    .filter((r) => inKid(filter, r.kidId))
    .forEach((r) => {
      items.push({
        key: `resched-${r.id}`,
        priority: 1,
        title: "Reschedule needs your response",
        sub: `${r.teacherName} proposed a new time for ${r.subject}.`,
        button: "Respond",
        href: "/parent/calendar?tab=reschedule",
        primary: true,
      });
    });

  return items.sort((x, y) => x.priority - y.priority || (x.days ?? 99) - (y.days ?? 99));
}

export const renewalsDue = (data: HomeData): HomeClass[] =>
  data.classes
    .filter((c) => c.status === "enrolled" && c.left <= 14 && !c.renewed)
    .sort((a, b) => a.left - b.left);

export interface Recommendation {
  course: HomeCourse;
  kid: HomeKid;
  score: number;
}

/** Sample scoring on grade, rating, subject mix and teacher familiarity. */
export function recommendationsFor(data: HomeData, kid: HomeKid): Recommendation[] {
  const mine = data.classes.filter((c) => c.kidId === kid.id);
  const have = new Set(mine.map((c) => c.title));
  const activeSubjects = new Set(mine.filter((c) => c.status !== "completed").map((c) => c.subject));

  return data.courses
    .filter((c) => !have.has(c.title) && kid.grade >= c.grades[0] && kid.grade <= c.grades[1])
    .map((course) => {
      let score = 20;
      score += course.rating ? course.rating * 6 : 18;
      if (mine.some((x) => data.classTeacherId[x.id] === course.teacherId)) score += 12;
      score += activeSubjects.has(course.subject) ? 4 : 10;
      if ((data.bookedDemoTitles[kid.id] ?? []).includes(course.title)) score += 5;
      return { course, kid, score };
    })
    .sort((a, b) => b.score - a.score);
}

/** Round-robin across learners so "All" shows a mix. */
export function pickRecommendations(
  data: HomeData,
  filter: LearnerFilter,
  limit = 3,
): Recommendation[] {
  const kids = data.kids.filter((k) => filter === "all" || k.id === filter);
  const lists = kids.map((k) => recommendationsFor(data, k));
  const used = new Set<string>();
  const out: Recommendation[] = [];

  for (let i = 0; out.length < limit && i < 8; i++) {
    for (const list of lists) {
      if (out.length >= limit) break;
      const r = list.find((x) => !used.has(x.course.id));
      if (r) {
        used.add(r.course.id);
        out.push(r);
      }
    }
  }
  return out;
}
