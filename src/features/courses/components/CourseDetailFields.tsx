import { Input } from "@/components/ui/input";
import SelectField from "@/features/shared/components/SelectField";
import {
  DURATION_OPTIONS,
  TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  FREQUENCY_OPTIONS,
  MODULE_OPTIONS,
} from "@/features/courses/constants/courseOptions";
import { getStandardPrice } from "@/features/courses/utils/coursePricing";
import type { CourseFormData } from "@/features/courses/types/course";

interface Props {
  formData: CourseFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  /**
   * True only when the teacher's own profile is both self-declared
   * IITian (Sep 2026, onboarding Step 1) AND Admin-approved
   * ("verified"). There is no manual per-course "list as IITian"
   * question — a teacher who hasn't declared IITian at onboarding,
   * or hasn't been verified yet, never sees the option at all.
   * Server-side re-derives this independently and is authoritative
   * regardless of this prop.
   */
  iitianEligible?: boolean;
}

export default function CourseDetailFields({
  formData,
  onChange,
  iitianEligible,
}: Props) {
  const standardPrice = getStandardPrice(formData.grade || null, formData.isIITian);
  const manualPrice = formData.price ? Number(formData.price) : null;
  const isPriceCustomized =
    standardPrice != null && manualPrice != null && manualPrice !== standardPrice;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SelectField
          name="duration"
          value={formData.duration}
          onChange={onChange}
          placeholder="Duration"
          options={DURATION_OPTIONS}
        />
        <SelectField
          name="type"
          value={formData.type}
          onChange={onChange}
          placeholder="Type"
          options={TYPE_OPTIONS}
        />
        <SelectField
          name="language"
          value={formData.language}
          onChange={onChange}
          placeholder="Language"
          options={LANGUAGE_OPTIONS}
        />
        <SelectField
          name="frequency"
          value={formData.frequency}
          onChange={onChange}
          placeholder="Frequency"
          options={FREQUENCY_OPTIONS}
        />
      </div>

      <Input
        name="courseTitle"
        placeholder="Course Title"
        value={formData.courseTitle}
        onChange={onChange}
      />

      <Input
        name="objective"
        placeholder="Objective"
        value={formData.objective}
        onChange={onChange}
      />

      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={onChange}
        rows={5}
        className="w-full border rounded-md px-3 py-3 text-sm resize-none"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SelectField
          name="modules"
          value={formData.modules}
          onChange={onChange}
          placeholder="Modules"
          options={MODULE_OPTIONS}
        />
        <Input
          name="courseTags"
          placeholder="Course Tags"
          value={formData.courseTags}
          onChange={onChange}
        />
        <Input
          name="price"
          placeholder="Price"
          value={formData.price}
          onChange={onChange}
          disabled={formData.isIITian}
        />
      </div>

      {iitianEligible ? (
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-800">IITian course</p>
          <p className="text-xs text-gray-500 mt-2">
            {`Your profile is marked as an IITian, so this course is always listed as an IITian course, fixed at ₹${getStandardPrice(null, true)}/session.`}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">
            {standardPrice != null
              ? `Price is prefilled with the standard rate for Grade ${formData.grade.replace(/\D/g, "") || "-"} (₹${standardPrice}/session). You can change it, but a different price will need Admin approval.`
              : "Select a grade to prefill the standard price, or enter your own."}
          </p>

          {isPriceCustomized && (
            <p className="text-xs text-amber-600 mt-1">
              You changed the price to ₹{manualPrice} (standard is ₹{standardPrice}) — Admin
              approval will be required before this course goes live.
            </p>
          )}
        </div>
      )}
    </>
  );
}
