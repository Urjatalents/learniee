interface DirectoryStatCardProps {
  label: string;
  value: number | string;
}

export default function DirectoryStatCard({ label, value }: DirectoryStatCardProps) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-purple-600 mt-1">{value}</p>
    </div>
  );
}
