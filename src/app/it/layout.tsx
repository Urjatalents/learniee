import StaffNavbar from "@/features/shared/components/layout/StaffNavbar";

export default function ItLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-violet-50/40">
      <StaffNavbar label="IT" homePath="/it" />
      <main className="min-h-screen pt-16 bg-gradient-to-b from-violet-50 via-white to-white">
        {children}
      </main>
    </div>
  );
}
