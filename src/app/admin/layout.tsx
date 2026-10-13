import AdminShell from "@/features/admin/components/ui/AdminShell";

/**
 * Shared Admin chrome. Every page under `/admin` renders inside it, so
 * pages supply content only (no per-page header or full-screen wrapper).
 * Route protection stays in `middleware.ts`.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
