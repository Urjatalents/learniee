"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  RefreshCw,
  Calculator,
  Landmark,
  Wallet,
  User,
  BookOpen,
  Award,
  Newspaper,
  ClipboardCheck,
  CalendarOff,
  Video,
  Radio,
  MessageCircle,
  ListChecks,
  GraduationCap,
  AlertCircle,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";

interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

// Same grouping/order as before — only the visual treatment below
// was changed (Sep 7, 2026) to match ParentSidebar's design system
// (gradient background, pill-shaped active state, section labels)
// so the Teacher and Parent dashboards read as one consistent
// product instead of two different UI styles.
//
// Sections put what's actually built first (Main), then group the
// remaining placeholder items by theme instead of leaving them as
// one long, arbitrarily-ordered list — see 01-PROJECT-STATUS.md /
// 05-MODULE-SPECS-INDEX.md for what's built vs. still a placeholder
// route on the Teacher side.
const menuSections: MenuSection[] = [
  {
    label: "Main",
    items: [
      { label: "Home", path: "/teacher", icon: LayoutDashboard },
      { label: "My Classes", path: "/teacher/my-classes", icon: GraduationCap },
      { label: "Course Management", path: "/teacher/course-management", icon: BookOpen },
      { label: "Enrollments", path: "/teacher/enrollments", icon: ListChecks },
      { label: "Calendar", path: "/teacher/calendar", icon: CalendarDays },
      { label: "Chat", path: "/teacher/chat", icon: MessageCircle },
    ],
  },
  {
    label: "Schedule",
    items: [
      { label: "HW & Tests", path: "/teacher/hw-tests", icon: ClipboardCheck },
      { label: "Reschedule", path: "/teacher/reschedule", icon: RefreshCw },
      { label: "Leave", path: "/teacher/leave", icon: CalendarOff },
      { label: "Complain", path: "/teacher/complain", icon: AlertCircle },
    ],
  },
  {
    label: "Growth & Earnings",
    items: [
      { label: "Earnings", path: "/teacher/earnings", icon: Wallet },
      { label: "Rate Calculator", path: "/teacher/rate-calculator", icon: Calculator },
      { label: "Bank Account", path: "/teacher/bank-account", icon: Landmark },
      { label: "Certificate Management", path: "/teacher/certificates", icon: Award },
    ],
  },
  {
    label: "Community & Live",
    items: [
      { label: "Blogs", path: "/teacher/blogs", icon: Newspaper },
      { label: "Demo", path: "/teacher/demo", icon: Video },
      { label: "Go Live", path: "/teacher/go-live", icon: Radio },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", path: "/teacher/profile", icon: User },
      { label: "Settings", path: "/teacher/settings", icon: Settings },
    ],
  },
];

interface TeacherSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeacherSidebar({ isOpen, onClose }: TeacherSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;

    // "/teacher" needs an exact match — otherwise it'd prefix-match
    // every teacher sub-route and Home would show as active everywhere.
    const isActive =
      item.path === "/teacher"
        ? pathname === "/teacher"
        : pathname === item.path || pathname.startsWith(`${item.path}/`);

    return (
      <button
        key={item.path}
        type="button"
        onClick={() => handleNavigation(item.path)}
        className={`
          group w-full flex items-center gap-3 text-left text-sm py-2 px-3 rounded-xl transition-all
          ${
            isActive
              ? "bg-white text-brand-dark font-bold shadow-playful"
              : "text-white/85 hover:bg-white/10 hover:text-white"
          }
        `}
      >
        <span
          className={`
            w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
            ${
              isActive
                ? "bg-brand-yellow text-violet-900"
                : "bg-white/10 text-white group-hover:bg-white/20"
            }
          `}
        >
          <Icon size={14} strokeWidth={2} />
        </span>
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile / Tablet overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-violet-950/40 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-16 bottom-0 left-0 z-40 w-64
          bg-gradient-to-b from-brand-light to-brand-dark
          rounded-r-[2rem] px-4 py-6 text-white overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
              Welcome back
            </p>
            <h2 className="font-heading text-2xl font-bold text-brand-yellow leading-tight">
              Teacher Hub
            </h2>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Menu, grouped into labelled sections — Main (built
            features) first, then remaining placeholder routes
            grouped by theme instead of one long undifferentiated
            list, same pattern as ParentSidebar. */}
        <nav className="space-y-5">
          {menuSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                {section.label}
              </p>
              <div className="space-y-1">{section.items.map(renderItem)}</div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
