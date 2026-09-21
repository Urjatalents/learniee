import { AlertTriangle, CheckCircle2, Circle, XCircle } from "lucide-react";

import type { AdminTeacher } from "@/features/admin/types/teacher";
import { getCompleteness } from "@/features/admin/utils/teacherCompleteness";

/** At-a-glance checklist so Admin can see what the teacher has (and hasn't) provided before deciding. */
export default function TeacherCompletenessPanel({ teacher }: { teacher: AdminTeacher }) {
  const { items, missingRequired } = getCompleteness(
    teacher.files.map((file) => file.type),
    Boolean(teacher.panCardNumber?.trim()),
  );

  return (
    <div
      className={`rounded-xl border p-5 ${
        missingRequired === 0 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        {missingRequired === 0 ? (
          <CheckCircle2 className="size-5 text-green-600" />
        ) : (
          <AlertTriangle className="size-5 text-amber-600" />
        )}
        <h3 className="text-sm font-semibold text-gray-800">
          {missingRequired === 0
            ? "All required items provided"
            : `${missingRequired} required item${missingRequired > 1 ? "s" : ""} missing`}
        </h3>
      </div>

      <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-sm text-gray-700">
            {item.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-green-600" />
            ) : item.required ? (
              <XCircle className="size-4 shrink-0 text-red-500" />
            ) : (
              <Circle className="size-4 shrink-0 text-gray-300" />
            )}
            <span className={item.done ? "" : "text-gray-500"}>
              {item.label}
              {!item.required && <span className="text-gray-400"> (optional)</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
