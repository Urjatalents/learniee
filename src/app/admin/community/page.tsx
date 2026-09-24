import CommunityChat from "@/features/community/components/CommunityChat";

// Admin has no shared layout/navbar (01 §1), so this page owns the
// full viewport and a back arrow to the dashboard.
export default function AdminCommunityPage() {
  return <CommunityChat heightClass="h-screen" backPath="/admin" />;
}
