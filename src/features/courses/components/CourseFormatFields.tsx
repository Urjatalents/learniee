import { Input } from "@/components/ui/input";
import SelectField from "@/features/shared/components/SelectField";
import FormField, { controlClass } from "@/features/courses/components/FormField";
import {
  DURATION_OPTIONS,
  TYPE_OPTIONS,
  FREQUENCY_OPTIONS,
  MODULE_OPTIONS,
  CUSTOM_OPTION,
} from "@/features/courses/constants/courseOptions";
import type { CourseFormData } from "@/features/courses/types/course";

const TIME_SLOT_OPTIONS = ["Morning", "Afternoon", "Evening"];

interface Props {
  formData: CourseFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
}

/** "Lecture format" section: duration, type, frequency, modules, preferred time slot. */
export default function CourseFormatFields({ formData, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField label="Lecture duration" htmlFor="field-duration" hint="The price per lecture scales with this.">
        <SelectField id="field-duration" name="duration" value={formData.duration} onChange={onChange}
          placeholder="Select duration" options={DURATION_OPTIONS} className={controlClass} />
      </FormField>

      <FormField label="Class type" htmlFor="field-type">
        <SelectField id="field-type" name="type" value={formData.type} onChange={onChange}
          placeholder="Select type" options={TYPE_OPTIONS} className={controlClass} />
      </FormField>

      <FormField label="Frequency" htmlFor="field-frequency">
        <div className="space-y-2">
          <SelectField id="field-frequency" name="frequency" value={formData.frequency} onChange={onChange}
            placeholder="Select frequency" options={FREQUENCY_OPTIONS} className={controlClass} />

          {formData.frequency === CUSTOM_OPTION && (
            <Input
              name="frequencyCustom"
              placeholder="e.g. 2 days a week"
              value={formData.frequencyCustom}
              onChange={onChange}
              maxLength={60}
              aria-label="Custom frequency"
              className={controlClass}
            />
          )}
        </div>
      </FormField>

      <FormField label="Modules" htmlFor="field-modules">
        <div className="space-y-2">
          <SelectField id="field-modules" name="modules" value={formData.modules} onChange={onChange}
            placeholder="Select modules" options={MODULE_OPTIONS} className={controlClass} />

          {formData.modules === CUSTOM_OPTION && (
            <Input
              name="moduleCustom"
              type="number"
              min={1}
              max={50}
              placeholder="Number of modules"
              value={formData.moduleCustom}
              onChange={onChange}
              aria-label="Number of modules"
              className={controlClass}
            />
          )}
        </div>
      </FormField>

      <FormField
        label="Preferred time slot"
        htmlFor="field-timeSlot"
        hint="For our reference only — you still agree the exact days and time with each parent."
        className="md:col-span-2 md:max-w-[calc(50%-0.5rem)]"
      >
        <SelectField id="field-timeSlot" name="timeSlot" value={formData.timeSlot} onChange={onChange}
          placeholder="Select time slot" options={TIME_SLOT_OPTIONS} className={controlClass} />
      </FormField>
    </div>
  );
}
