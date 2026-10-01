import SelectField from "@/features/shared/components/SelectField";
import {
  CATEGORY_OPTIONS,
  SUBJECT_OPTIONS,
  GRADE_OPTIONS,
  BOARD_OPTIONS,
  EXPERIENCE_OPTIONS,
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
}

export default function CourseConfigFields({ formData, onChange, gradeLocked }: Props) {
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
          placeholder="Time Slot"
          options={TIME_SLOT_OPTIONS}
        />
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Course Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <SelectField
            name="subject"
            value={formData.subject}
            onChange={onChange}
            placeholder="Subject"
            options={SUBJECT_OPTIONS}
          />

          <SelectField
            name="grade"
            value={formData.grade}
            onChange={onChange}
            placeholder="Grade"
            options={GRADE_OPTIONS}
            disabled={gradeLocked}
          />

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
      </div>
    </>
  );
}
