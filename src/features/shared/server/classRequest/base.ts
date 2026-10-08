import { getStandardPrice } from "@/features/courses/utils/coursePricing";
import "server-only";

/**
 * Custom class requests (Oct 2026).
 *
 * Flow: Parent submits (PENDING_REVIEW) -> Admin approves (OPEN, which is the
 * "vacancy" every approved Teacher sees) or rejects -> a Teacher accepts or
 * declines -> an accepting Teacher lists a normal Course for it (it still goes
 * through the usual course approval) -> Parents join through the Courses page.
 *
 * Teachers never receive the Parent's identity, only the learner's grade.
 * Same shared-service layout as `complaint.service.ts` because three roles
 * touch the same rows.
 */

export class ClassRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export const MAX_TITLE = 120;
export const MAX_SUBJECT = 80;
export const MAX_DESCRIPTION = 2000;
export const MAX_NOTE = 500;
/** Stops one account flooding the Admin queue. */
export const MAX_PENDING_PER_PARENT = 5;
export interface CreateClassRequestInput {
  studentId?: string | null;
  title?: string;
  subject?: string;
  grade?: string | null;
  board?: string | null;
  language?: string | null;
  /** Weekdays, 0 = Sunday. Number of classes per week = how many are picked. */
  preferredDays?: unknown;
  /** "HH:mm" */
  preferredTime?: string | null;
  description?: string;
}
/** Fixed per-class price for a grade — the same tier rate the course listing uses. */
export function priceForGrade(grade: string | null | undefined): number | null {
  return getStandardPrice(grade || null, false);
}
export function parseDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  const days = value.map((d) => Number(d));

  if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new ClassRequestError("Preferred days are invalid.");
  }

  return [...new Set(days)].sort((a, b) => a - b);
}
export function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
export function optionalText(value: unknown, max: number, label: string): string | null {
  const text = clean(value);

  if (!text) return null;

  if (text.length > max) {
    throw new ClassRequestError(`${label} must be ${max} characters or fewer.`);
  }

  return text;
}
export function requiredText(value: unknown, max: number, label: string): string {
  const text = clean(value);

  if (!text) {
    throw new ClassRequestError(`${label} is required.`);
  }

  if (text.length > max) {
    throw new ClassRequestError(`${label} must be ${max} characters or fewer.`);
  }

  return text;
}
