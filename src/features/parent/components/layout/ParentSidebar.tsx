"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Share2,
  Video,
  BookOpen,
  Calendar,
  Heart,
  RefreshCw,
  CreditCard,
  FolderOpen,
  ListChecks,
  GraduationCap,
  Star,
  User,
  AlertCircle,
  Wallet as WalletIcon,
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

// Grouped + reordered per request (Aug 31, 2026): "Home" was
// previously missing entirely from the sidebar — on mobile the
// navbar's HOME button is hidden (`hidden sm:block`), so there was
// no way back to /parent except browser back. It's now the first
// item here, always visible regardless of screen size.
//
// Part 2C (Sep 2026): "My Enrollments", "Home works/tests" and "Chat"
// are merged into "My Classes" (/parent/my-classes) — each course's
// classes, homework and chat live on one page. The old routes stay
// as redirects/legacy views so no existing link breaks.
//
// Note (still true): Preference, Notification, Gift, Go Live,
// Learnie Mall, Suggestions, Transcripts, FAQs, and Blogs stay
// removed — none of those pages are built yet (see
// 02-ARCHITECTURE.md's Deliberately Deferred list / 06-OPEN-DECISIONS.md
// #6).
const menuSections: MenuSection[] = [
  {
    label: "Main",
    items: [
      { label: "Home", path: "/parent", icon: LayoutDashboard },
      { label: "Courses", path: "/parent/courses", icon: BookOpen },
      { label: "Free Demo", path: "/parent/free-demo", icon: Video },
      { label: "Calendar", path: "/parent/calendar", icon: Calendar },
    ],
  },
  {
    label: "My Learning",
    items: [
      { label: "My Classes", path: "/parent/my-classes", icon: ListChecks },
      { label: "Reschedule", path: "/parent/reschedule", icon: RefreshCw },
      { label: "Payments", path: "/parent/payments", icon: CreditCard },
      { label: "Wallet", path: "/parent/wallet", icon: WalletIcon },
      { label: "Favorites", path: "/parent/favorites", icon: Heart },
    ],
  },
  {
    label: "Discover",
    items: [
      { label: "Teacher", path: "/parent/teachers", icon: GraduationCap },
      { label: "Resources", path: "/parent/resources", icon: FolderOpen },
      { label: "Reviews", path: "/parent/reviews", icon: Star },
    ],
  },
  {
    label: "Account & Support",
    items: [
      { label: "Referral", path: "/parent/referral", icon: Share2 },
      { label: "Profile", path: "/parent/profile", icon: User },
      { label: "Settings", path: "/parent/settings", icon: Settings },
      { label: "Complain", path: "/parent/complain", icon: AlertCircle },
    ],
  },
];

interface ParentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ParentSidebar({ isOpen, onClose }: ParentSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;

    const isActive =
      item.path === "/parent"
        ? pathname === "/parent"
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
              Parent Hub
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

        {/* Menu, grouped into labelled sections instead of one long
            undifferentiated list — makes it easier to scan/find an
            item, and keeps related actions (e.g. Reschedule/Payments)
            visually together. */}
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
