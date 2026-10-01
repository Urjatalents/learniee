import { Info, Lock, ShieldCheck, TriangleAlert } from "lucide-react";

import { Input } from "@/components/ui/input";
import FormField, { controlClass } from "@/features/courses/components/FormField";
import { getStandardPrice, getStandardSessionPrice } from "@/features/courses/utils/coursePricing";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import type { CourseFormData } from "@/features/courses/types/course";

interface Props {
  formData: CourseFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  /**
   * True only when the teacher's own profile is both self-declared
   * IITian (onboarding Step 1) AND Admin-approved ("verified"). A teacher
   * who isn't never sees the IITian option. The create-course API
   * re-derives this and is authoritative regardless of this prop.
   */
  iitianEligible?: boolean;
  /** Vacancy listing: the price is fixed by the request's grade and read-only. */
  priceLocked?: boolean;
}

/** "Pricing" section. Standard rates are per hour; the per-session price scales with lecture length. */
export default function CoursePricingFields({ formData, onChange, iitianEligible, priceLocked }: Props) {
  const lectureMinutes = sessionLengthForCourse(formData.duration);
  const hourlyRate = getStandardPrice(formData.grade || null, formData.isIITian);
  const standardPrice = getStandardSessionPrice(formData.grade || null, formData.isIITian, lectureMinutes);
  const manualPrice = formData.price ? Number(formData.price) : null;
  const isPriceCustomized =
    standardPrice != null && manualPrice != null && manualPrice !== standardPrice;
  const readOnly = formData.isIITian || Boolean(priceLocked);

  let tone = "bg-violet-50 text-violet-800 border-violet-100";
  let Icon = Info;
  let message =
    "Select a grade to prefill the standard price, or enter your own.";

  if (priceLocked) {
    tone = "bg-violet-50 text-violet-800 border-violet-100";
    Icon = Lock;
    message = `This course is for a parent's class request, so the price is fixed by grade at ₹${hourlyRate ?? "-"}/hour — ₹${standardPrice ?? formData.price}/session for a ${lectureMinutes}-minute lecture. It can't be changed.`;
  } else if (iitianEligible) {
    Icon = ShieldCheck;
    message = `Your profile is marked as an IITian, so this course is always listed as an IITian course, fixed at ₹${getStandardPrice(null, true)}/hour — ₹${standardPrice ?? "-"}/session for a ${lectureMinutes}-minute lecture.`;
  } else if (isPriceCustomized) {
    tone = "bg-amber-50 text-amber-800 border-amber-200";
    Icon = TriangleAlert;
    message = `You changed the price to ₹${manualPrice} (standard is ₹${standardPrice}). Admin approval will be required before this course goes live.`;
  } else if (standardPrice != null) {
    message = `Standard rate for ${formData.grade || "this grade"} is ₹${hourlyRate}/hour, scaled to your ${lectureMinutes}-minute lecture: ₹${standardPrice}/session. You can change it, but a different price will need Admin approval.`;
  }

  return (
    <>
      <FormField label="Price per session" htmlFor="field-price" required>
        <div className="relative max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-gray-500">
            ₹
          </span>
          <Input
            id="field-price"
            name="price"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="0"
            value={formData.price}
            onChange={onChange}
            disabled={readOnly}
            className={`${controlClass} pl-7 font-semibold`}
          />
        </div>
      </FormField>

      <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${tone}`}>
        <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </>
  );
}
