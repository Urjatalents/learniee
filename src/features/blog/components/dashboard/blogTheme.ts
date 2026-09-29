import { BookOpen, GraduationCap, Lightbulb, Rocket, Sparkles, type LucideIcon } from "lucide-react";

/** One gradient + icon per category, so a category always looks the same. */
const THEMES: { gradient: string; icon: LucideIcon }[] = [
  { gradient: "from-violet-600 to-fuchsia-500", icon: BookOpen },
  { gradient: "from-sky-500 to-indigo-600", icon: Lightbulb },
  { gradient: "from-emerald-500 to-teal-600", icon: GraduationCap },
  { gradient: "from-rose-500 to-orange-500", icon: Sparkles },
  { gradient: "from-amber-500 to-orange-600", icon: Rocket },
];

export function blogTheme(category: string) {
  let sum = 0;
  for (const ch of category) sum += ch.charCodeAt(0);

  return THEMES[sum % THEMES.length];
}
