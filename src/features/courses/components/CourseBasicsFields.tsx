import { Input } from "@/components/ui/input";
import FormField, { controlClass, textareaClass } from "@/features/courses/components/FormField";
import type { CourseFormData } from "@/features/courses/types/course";

interface Props {
  formData: CourseFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
}

export default function CourseBasicsFields({ formData, onChange }: Props) {
  return (
    <>
      <FormField label="Course title" htmlFor="field-courseTitle" required>
        <Input
          id="field-courseTitle"
          name="courseTitle"
          placeholder="e.g. Class 8 Mathematics — Algebra made easy"
          value={formData.courseTitle}
          onChange={onChange}
          className={controlClass}
        />
      </FormField>

      <FormField
        label="Objective"
        htmlFor="field-objective"
        hint="One line on what a student will be able to do after the course."
      >
        <Input
          id="field-objective"
          name="objective"
          placeholder="e.g. Solve linear equations with confidence"
          value={formData.objective}
          onChange={onChange}
          className={controlClass}
        />
      </FormField>

      <FormField label="Description" htmlFor="field-description">
        <textarea
          id="field-description"
          name="description"
          placeholder="Describe what you teach, your approach and who it suits."
          value={formData.description}
          onChange={onChange}
          rows={5}
          className={textareaClass}
        />
      </FormField>

      <FormField
        label="Course tags"
        htmlFor="field-courseTags"
        hint="Keywords parents might search for, separated by commas."
      >
        <Input
          id="field-courseTags"
          name="courseTags"
          placeholder="e.g. algebra, olympiad, exam prep"
          value={formData.courseTags}
          onChange={onChange}
          className={controlClass}
        />
      </FormField>
    </>
  );
}
