/**
 * Complaint departments + urgent contact numbers.
 *
 * Client-safe (no `server-only`, no Prisma import) because the Parent/
 * Teacher complain pages and the Admin list all read it. Values mirror the
 * Prisma `ComplaintDepartment` enum.
 *
 * The phone numbers are PLACEHOLDERS. Set the real ones through the
 * `NEXT_PUBLIC_COMPLAINT_PHONE_*` env vars (same pattern as
 * `src/lib/companyInfo.ts`) — no code change needed.
 */

export type ComplaintDepartmentValue = "ACCOUNTS" | "HR" | "IT";

export interface ComplaintDepartmentOption {
  value: ComplaintDepartmentValue;
  label: string;
  /** What this department handles, shown under the option. */
  handles: string;
  /** Human-readable, e.g. "+91 98765 43210". */
  phone: string;
}

const DUMMY_PHONES: Record<ComplaintDepartmentValue, string> = {
  ACCOUNTS: "+91 98765 43210",
  HR: "+91 98765 43211",
  IT: "+91 98765 43212",
};

// Each env var is referenced literally so Next.js can inline it at build time.
const ENV_PHONES: Record<ComplaintDepartmentValue, string | undefined> = {
  ACCOUNTS: process.env.NEXT_PUBLIC_COMPLAINT_PHONE_ACCOUNTS,
  HR: process.env.NEXT_PUBLIC_COMPLAINT_PHONE_HR,
  IT: process.env.NEXT_PUBLIC_COMPLAINT_PHONE_IT,
};

function phoneFor(value: ComplaintDepartmentValue): string {
  return ENV_PHONES[value]?.trim() || DUMMY_PHONES[value];
}

export const COMPLAINT_DEPARTMENTS: ComplaintDepartmentOption[] = [
  {
    value: "ACCOUNTS",
    label: "Accounts",
    handles: "Payments, refunds, wallet, invoices, payouts",
    phone: phoneFor("ACCOUNTS"),
  },
  {
    value: "HR",
    label: "HR",
    handles: "Classes, teachers, schedules, conduct",
    phone: phoneFor("HR"),
  },
  {
    value: "IT",
    label: "IT Support",
    handles: "App not working, login problems, bugs",
    phone: phoneFor("IT"),
  },
];

export const COMPLAINT_DEPARTMENT_LABELS: Record<ComplaintDepartmentValue, string> = {
  ACCOUNTS: "Accounts",
  HR: "HR",
  IT: "IT Support",
};

/** `+91 98765 43210` -> `tel:+919876543210` */
export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
