import {
  LayoutDashboard,
  Search,
  ListChecks,
  Video,
  Calendar,
  RefreshCw,
  BookOpen,
  CreditCard,
  User,
  Newspaper,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

export interface ParentNavItem {
  id: string;
  label: string;
  /** Where the item links to (hub tab URLs included). */
  href: string;
  icon: LucideIcon;
  /** Route prefix that owns this item. */
  base: string;
  /** Extra prefixes that keep the item highlighted (detail pages, old routes). */
  matches?: string[];
  /** Hub tab (?tab=) this item points at; `excludeTabs` are tabs that belong to a sibling item. */
  tab?: string;
  excludeTabs?: string[];
}

export const PARENT_NAV: Record<string, ParentNavItem> = {
  home: { id: "home", label: "Home", href: "/parent", base: "/parent", icon: LayoutDashboard },
  courses: {
    id: "courses",
    label: "Courses",
    href: "/parent/courses",
    base: "/parent/courses",
    matches: ["/parent/teachers", "/parent/request-class"],
    icon: Search,
  },
  classes: {
    id: "classes",
    label: "My classes",
    href: "/parent/my-classes",
    base: "/parent/my-classes",
    matches: [
      "/parent/homework-tests",
      "/parent/chat",
      "/parent/enrollments",
      "/parent/certificates",
    ],
    excludeTabs: ["demos", "resources"],
    icon: ListChecks,
  },
  demos: {
    id: "demos",
    label: "Demos",
    href: "/parent/my-classes?tab=demos",
    base: "/parent/my-classes",
    matches: ["/parent/demo-feedback"],
    tab: "demos",
    icon: Video,
  },
  calendar: {
    id: "calendar",
    label: "Calendar",
    href: "/parent/calendar",
    base: "/parent/calendar",
    matches: ["/parent/classes"],
    excludeTabs: ["reschedule"],
    icon: Calendar,
  },
  reschedule: {
    id: "reschedule",
    label: "Reschedule",
    href: "/parent/calendar?tab=reschedule",
    base: "/parent/calendar",
    tab: "reschedule",
    icon: RefreshCw,
  },
  library: {
    id: "library",
    label: "Library",
    href: "/parent/my-classes?tab=resources",
    base: "/parent/my-classes",
    tab: "resources",
    icon: BookOpen,
  },
  payments: {
    id: "payments",
    label: "Payments",
    href: "/parent/payments",
    base: "/parent/payments",
    matches: ["/parent/wallet", "/parent/referral"],
    icon: CreditCard,
  },
  account: {
    id: "account",
    label: "Account",
    href: "/parent/account",
    base: "/parent/account",
    matches: ["/parent/profile", "/parent/settings", "/parent/students"],
    icon: User,
  },
  blogs: { id: "blogs", label: "Blogs", href: "/parent/blogs", base: "/parent/blogs", icon: Newspaper },
  help: { id: "help", label: "Help", href: "/parent/complain", base: "/parent/complain", icon: LifeBuoy },
};

/** Sidebar order, with separators between groups. */
export const SIDEBAR_GROUPS: string[][] = [
  ["home", "courses", "classes", "demos", "calendar", "reschedule", "library"],
  ["payments", "account"],
  ["blogs", "help"],
];

export const BOTTOM_NAV_IDS = ["home", "courses", "classes", "calendar"];
export const MORE_NAV_IDS = ["demos", "reschedule", "library", "payments", "blogs", "account", "help"];

const under = (path: string, p: string) => path === p || path.startsWith(`${p}/`);

export function isNavActive(
  item: ParentNavItem,
  pathname: string,
  tab: string | null,
): boolean {
  if (item.id === "home") return pathname === "/parent";
  if (item.tab) return under(pathname, item.base) && tab === item.tab;
  if (under(pathname, item.base)) {
    return !(tab && item.excludeTabs?.includes(tab));
  }
  return (item.matches ?? []).some((p) => under(pathname, p));
}
