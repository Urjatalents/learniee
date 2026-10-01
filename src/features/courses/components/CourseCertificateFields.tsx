import { Input } from "@/components/ui/input";
import FormField, { controlClass } from "@/features/courses/components/FormField";
import type { CourseFormData } from "@/features/courses/types/course";

interface Props {
  formData: CourseFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  onToggle: (checked: boolean) => void;
}

/**
 * Certification (Sep 2026). Off by default - most courses issue no
 * certificate. When enabled, the Teacher picks how many *counted*
 * sessions (COMPLETED / STUDENT_NO_SHOW / CANCELLED_LATE - the same
 * rule TCC already uses, see sessionOutcome.ts) a student needs
 * before a certificate becomes available on the Teacher's
 * Certification tab. Set once at course creation - there's no
 * course-edit screen yet to revise it later.
 */
export default function CourseCertificateFields({ formData, onChange, onToggle }: Props) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-800">Issue a certificate on completion</p>
          <p className="text-sm text-gray-500 mt-0.5">
            When enabled, a certificate becomes available for you to allot once a student completes the
            chosen number of sessions in this course.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={formData.certificateEnabled}
          aria-label="Issue a certificate on completion"
          onClick={() => onToggle(!formData.certificateEnabled)}
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
            formData.certificateEnabled ? "bg-violet-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
              formData.certificateEnabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      {formData.certificateEnabled && (
        <FormField
          label="Sessions required for certificate"
          htmlFor="field-certificateSessionThreshold"
          required
          hint="Set once when you create the course — it can't be changed later."
          className="max-w-xs"
        >
          <Input
            id="field-certificateSessionThreshold"
            type="number"
            name="certificateSessionThreshold"
            min={1}
            step={1}
            value={formData.certificateSessionThreshold}
            onChange={onChange}
            placeholder="e.g. 12"
            className={controlClass}
          />
        </FormField>
      )}
    </>
  );
}
