import { AdminStatCard } from "@/features/admin/components/ui/primitives";

interface DirectoryStatCardProps {
  label: string;
  value: number | string;
}

export default function DirectoryStatCard({ label, value }: DirectoryStatCardProps) {
  return <AdminStatCard label={label} value={value} />;
}
