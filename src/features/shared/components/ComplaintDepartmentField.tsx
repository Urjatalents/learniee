"use client";

import { Phone } from "lucide-react";

import {
  COMPLAINT_DEPARTMENTS,
  toTelHref,
  type ComplaintDepartmentValue,
} from "@/features/shared/utils/complaintDepartment";

/**
 * Department picker for the Parent/Teacher complain forms. Shows the
 * urgent-contact number of the selected department (placeholders until real
 * numbers are set — see `complaintDepartment.ts`).
 */
export default function ComplaintDepartmentField({
  value,
  onChange,
}: {
  value: ComplaintDepartmentValue | "";
  onChange: (value: ComplaintDepartmentValue) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-gray-600">Report to</legend>

      <div className="grid gap-2">
        {COMPLAINT_DEPARTMENTS.map((dept) => {
          const selected = value === dept.value;

          return (
            <label
              key={dept.value}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition ${
                selected ? "border-brand bg-violet-50" : "border-gray-200 bg-gray-50 hover:border-violet-200"
              }`}
            >
              <input
                type="radio"
                name="complaint-department"
                value={dept.value}
                checked={selected}
                onChange={() => onChange(dept.value)}
                className="mt-1 accent-violet-600"
              />
              <span className="flex-1">
                <span className="block text-sm font-bold text-gray-800">{dept.label}</span>
                <span className="block text-xs text-gray-500">{dept.handles}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
        <p className="text-xs font-semibold text-gray-600 mb-1">Urgent? Call directly</p>
        <ul className="space-y-1">
          {COMPLAINT_DEPARTMENTS.map((dept) => (
            <li
              key={dept.value}
              className={`flex items-center justify-between text-xs ${
                value === dept.value ? "font-bold text-gray-800" : "text-gray-500"
              }`}
            >
              <span>{dept.label}</span>
              <a
                href={toTelHref(dept.phone)}
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                <Phone size={12} />
                {dept.phone}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </fieldset>
  );
}
