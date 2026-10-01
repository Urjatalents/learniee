import { Input } from "@/components/ui/input";
import SelectField from "@/features/shared/components/SelectField";
import {
  CATEGORY_OPTIONS,
  SUBJECT_OPTIONS,
  GRADE_OPTIONS,
  BOARD_OPTIONS,
  EXPERIENCE_OPTIONS,
  OTHER_SUBJECT,
} from "@/features/courses/constants/courseOptions";
import type { CourseFormData } from "@/features/courses/types/course";

const TIME_SLOT_OPTIONS = ["Morning", "Afternoon", "Evening"];

interface Props {
  formData: CourseFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  /** Grade is read-only (vacancy listing). */
  gradeLocked?: boolean;
  onGradeModeChange: (mode: "single" | "range") => void;
}

export default function CourseConfigFields({ formData, onChange, gradeLocked, onGradeModeChange }: Props) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          name="category"
          value={formData.category}
          onChange={onChange}
          placeholder="Category"
          options={CATEGORY_OPTIONS}
        />

        <SelectField
          name="timeSlot"
          value={formData.timeSlot}
          onChange={onChange}
          placeholder="Preferred Time Slot"
          options={TIME_SLOT_OPTIONS}
        />
        <p className="text-xs text-gray-500 md:col-span-2 -mt-2">
          Preferred time slot is for our reference only — you still agree the exact days and time with
          each parent.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Course Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <SelectField
              name="subject"
              value={formData.subject}
              onChange={onChange}
              placeholder="Subject"
              options={SUBJECT_OPTIONS}
            />

            {formData.subject === OTHER_SUBJECT && (
              <Input
                name="subjectOther"
                placeholder="Write the subject"
                value={formData.subjectOther}
                onChange={onChange}
                maxLength={80}
              />
            )}
          </div>

          <SelectField
            name="board"
            value={formData.board}
            onChange={onChange}
            placeholder="Board"
            options={BOARD_OPTIONS}
          />

          <SelectField
            name="experience"
            value={formData.experience}
            onChange={onChange}
            placeholder="Experience"
            options={EXPERIENCE_OPTIONS}
          />
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Grade</span>
            {(["single", "range"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={gradeLocked}
                onClick={() => onGradeModeChange(mode)}
                className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors disabled:opacity-60 ${
                  formData.gradeMode === mode
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-purple-300"
                }`}
              >
                {mode === "single" ? "Single grade" : "Grade range"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SelectField
              name="gradeFrom"
              value={formData.gradeFrom}
              onChange={onChange}
              placeholder={formData.gradeMode === "range" ? "From grade" : "Grade"}
              options={GRADE_OPTIONS}
              disabled={gradeLocked}
            />

            {formData.gradeMode === "range" && (
              <SelectField
                name="gradeTo"
                value={formData.gradeTo}
                onChange={onChange}
                placeholder="To grade"
                options={GRADE_OPTIONS.filter(
                  (g) => Number(g.replace(/\D/g, "")) > Number(formData.gradeFrom.replace(/\D/g, "")),
                )}
                disabled={gradeLocked}
              />
            )}
          </div>

          {formData.gradeMode === "range" && (
            <p className="text-xs text-gray-500">
              A grade range is priced at the rate of its highest grade.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
