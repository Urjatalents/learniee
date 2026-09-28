"use client";

import { GraduationCap, Laptop, Phone, Wallet, type LucideIcon } from "lucide-react";

import {
  COMPLAINT_DEPARTMENTS,
  toTelHref,
  type ComplaintDepartmentValue,
} from "@/features/shared/utils/complaintDepartment";

export const COMPLAINT_DEPARTMENT_ICONS: Record<ComplaintDepartmentValue, LucideIcon> = {
  ACCOUNTS: Wallet,
  HR: GraduationCap,
  IT: Laptop,
};

/**
 * Department picker for the Parent/Teacher complain forms: three cards in a
 * row (stacked on phones), each with its own urgent-contact number. The card
 * body is the radio; the phone link sits outside the radio button so tapping
 * it dials instead of selecting.
 */
export default function ComplaintDepartmentField({
  value,
  onChange,
}: {
  value: ComplaintDepartmentValue | "";
  onChange: (value: ComplaintDepartmentValue) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Report to" className="grid gap-3 sm:grid-cols-3">
      {COMPLAINT_DEPARTMENTS.map((dept) => {
        const selected = value === dept.value;
        const Icon = COMPLAINT_DEPARTMENT_ICONS[dept.value];

        return (
          <div
            key={dept.value}
            className={`flex flex-col rounded-2xl border-2 transition ${
              selected
                ? "border-brand bg-violet-50"
                : "border-gray-100 bg-white hover:border-violet-200"
            }`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(dept.value)}
              className="flex-1 text-left p-4 pb-3 outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-t-2xl"
            >
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl mb-3 ${
                  selected ? "bg-brand text-white" : "bg-violet-50 text-brand"
                }`}
              >
                <Icon size={18} />
              </span>
              <span className="block font-heading text-sm font-bold text-gray-800">
                {dept.label}
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">{dept.handles}</span>
            </button>

            <a
              href={toTelHref(dept.phone)}
              className="mx-4 mb-4 mt-1 inline-flex items-center gap-1.5 border-t border-gray-100 pt-3 text-xs font-semibold text-brand hover:underline"
            >
              <Phone size={12} />
              {dept.phone}
            </a>
          </div>
        );
      })}
    </div>
  );
}
