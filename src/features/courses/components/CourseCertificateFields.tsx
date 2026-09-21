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
    <div className="border border-gray-200 rounded-lg p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <input
          type="checkbox"
          checked={formData.certificateEnabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
        />
        Issue a certificate on completion
      </label>

      <p className="text-xs text-gray-500 mt-1 mb-3">
        When enabled, a certificate becomes available for you to allot once a
        student completes the chosen number of sessions in this course.
      </p>

      {formData.certificateEnabled && (
        <div className="max-w-xs">
          <label className="text-xs text-gray-500 block mb-1">
            Sessions required for certificate
          </label>
          <input
            type="number"
            name="certificateSessionThreshold"
            min={1}
            step={1}
            value={formData.certificateSessionThreshold}
            onChange={onChange}
            placeholder="e.g. 12"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}
