import { Input } from "@/components/ui/input";
import SelectField from "@/features/shared/components/SelectField";
import FormField, { controlClass } from "@/features/courses/components/FormField";
import {
  CATEGORY_OPTIONS,
  SUBJECT_OPTIONS,
  GRADE_OPTIONS,
  BOARD_OPTIONS,
  EXPERIENCE_OPTIONS,
  LANGUAGE_OPTIONS,
  OTHER_SUBJECT,
} from "@/features/courses/constants/courseOptions";
import type { CourseFormData } from "@/features/courses/types/course";

interface Props {
  formData: CourseFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  /** Grade is read-only (vacancy listing). */
  gradeLocked?: boolean;
  onGradeModeChange: (mode: "single" | "range") => void;
}

const gradeNumber = (grade: string) => Number(grade.replace(/\D/g, ""));

/** "Subject & learners" section: category, subject, grade (single/range), board, level, language. */
export default function CourseConfigFields({ formData, onChange, gradeLocked, onGradeModeChange }: Props) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Category" htmlFor="field-category">
          <SelectField id="field-category" name="category" value={formData.category} onChange={onChange}
            placeholder="Select category" options={CATEGORY_OPTIONS} className={controlClass} />
        </FormField>

        <FormField label="Subject" htmlFor="field-subject">
          <div className="space-y-2">
            <SelectField id="field-subject" name="subject" value={formData.subject} onChange={onChange}
              placeholder="Select subject" options={SUBJECT_OPTIONS} className={controlClass} />

            {formData.subject === OTHER_SUBJECT && (
              <Input
                name="subjectOther"
                placeholder="Write the subject name"
                value={formData.subjectOther}
                onChange={onChange}
                maxLength={80}
                aria-label="Subject name"
                className={controlClass}
              />
            )}
          </div>
        </FormField>
      </div>

      <FormField label="Grade" hint={
        formData.gradeMode === "range"
          ? "A grade range is priced at the rate of its highest grade."
          : gradeLocked
            ? "Fixed by the class request."
            : undefined
      }>
        <div className="space-y-3">
          <div className="inline-flex rounded-lg bg-gray-100 p-1" role="group" aria-label="Grade type">
            {(["single", "range"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={gradeLocked}
                aria-pressed={formData.gradeMode === mode}
                onClick={() => onGradeModeChange(mode)}
                className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors disabled:cursor-not-allowed ${
                  formData.gradeMode === mode
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {mode === "single" ? "Single grade" : "Grade range"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectField
              name="gradeFrom"
              value={formData.gradeFrom}
              onChange={onChange}
              placeholder={formData.gradeMode === "range" ? "From grade" : "Select grade"}
              options={GRADE_OPTIONS}
              disabled={gradeLocked}
              className={controlClass}
            />

            {formData.gradeMode === "range" && (
              <SelectField
                name="gradeTo"
                value={formData.gradeTo}
                onChange={onChange}
                placeholder="To grade"
                options={GRADE_OPTIONS.filter((g) => gradeNumber(g) > gradeNumber(formData.gradeFrom))}
                disabled={gradeLocked}
                className={controlClass}
              />
            )}
          </div>
        </div>
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Board" htmlFor="field-board">
          <SelectField id="field-board" name="board" value={formData.board} onChange={onChange}
            placeholder="Select board" options={BOARD_OPTIONS} className={controlClass} />
        </FormField>

        <FormField label="Level" htmlFor="field-experience">
          <SelectField id="field-experience" name="experience" value={formData.experience} onChange={onChange}
            placeholder="Select level" options={EXPERIENCE_OPTIONS} className={controlClass} />
        </FormField>

        <FormField label="Language" htmlFor="field-language">
          <SelectField id="field-language" name="language" value={formData.language} onChange={onChange}
            placeholder="Select language" options={LANGUAGE_OPTIONS} className={controlClass} />
        </FormField>
      </div>
    </>
  );
}
