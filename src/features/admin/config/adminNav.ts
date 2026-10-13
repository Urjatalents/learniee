import {
  AlertCircle,
  Briefcase,
  BookOpen,
  BookOpenCheck,
  Building2,
  CalendarOff,
  ClipboardCheck,
  Flag,
  FolderOpen,
  GraduationCap,
  History,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  Receipt,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { AdminQueueCounts } from "@/features/admin/types/queueCounts";

export type AdminCountKey = keyof AdminQueueCounts;

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Key into the queue-counts payload; omit for pages with no queue. */
  countKey?: AdminCountKey;
  /** Extra path prefixes that should also highlight this item. */
  matchPrefixes?: string[];
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

/** Single source of truth for the sidebar and the dashboard queue cards. */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "",
    items: [{ label: "Overview", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Approvals",
    items: [
      { label: "Teacher applications", href: "/admin/teachers", icon: UserCheck, countKey: "teachers" },
      { label: "Course approvals", href: "/admin/courses", icon: BookOpenCheck, countKey: "courses" },
      { label: "Enrollment approvals", href: "/admin/enrollments", icon: ListChecks, countKey: "enrollments" },
      { label: "Bank accounts", href: "/admin/bank-accounts", icon: Landmark, countKey: "bankAccounts" },
      { label: "Blog posts", href: "/admin/blogs", icon: BookOpen, countKey: "blogs" },
    ],
  },
  {
    label: "Classes and safety",
    items: [
      { label: "Class reviews", href: "/admin/session-reviews", icon: ClipboardCheck, countKey: "classReviews" },
      { label: "Teacher strikes", href: "/admin/teacher-strikes", icon: ShieldAlert, countKey: "strikes" },
      { label: "Leave requests", href: "/admin/leave-requests", icon: CalendarOff, countKey: "leave" },
      { label: "Class requests", href: "/admin/class-requests", icon: Briefcase, countKey: "classRequests" },
      { label: "Chat monitor", href: "/admin/chat", icon: MessageCircle },
      { label: "Reported messages", href: "/admin/chat-reports", icon: Flag, countKey: "chatReports" },
      { label: "Complaints", href: "/admin/complaints", icon: AlertCircle, countKey: "complaints" },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Refund requests", href: "/admin/refund-requests", icon: RefreshCw, countKey: "refunds" },
      { label: "Payout review", href: "/admin/payout-review", icon: Wallet, countKey: "payouts" },
      { label: "Accounts", href: "/admin/accounts", icon: Receipt },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Teacher directory", href: "/admin/teacher-directory", icon: GraduationCap },
      { label: "Parent directory", href: "/admin/parent-directory", icon: Users },
      { label: "Manage users", href: "/admin/users", icon: UserX },
      { label: "Staff accounts", href: "/admin/staff-accounts", icon: Building2 },
      { label: "Account access", href: "/admin/account-access", icon: KeyRound },
    ],
  },
  {
    label: "Records",
    items: [
      { label: "Resource library", href: "/admin/resources", icon: FolderOpen },
      { label: "Activity log", href: "/admin/activity-logs", icon: History },
    ],
  },
];

/** Every nav item, flattened — handy for breadcrumbs and the dashboard. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap((group) => group.items);

export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  if (item.href === "/admin") return pathname === "/admin";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
