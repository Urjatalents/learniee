import { BookOpen } from "lucide-react";

import { Input } from "@/components/ui/input";
import SelectField from "@/features/shared/components/SelectField";
import FormSection from "@/features/parent/components/onboarding/FormSection";
import FormField from "@/features/parent/components/onboarding/FormField";
import LabeledSelect, {
  type LabeledOption,
} from "@/features/teacher/components/onboarding/LabeledSelect";
import type { Step2ChangeHandler, Step2FormData } from "@/features/teacher/types/step2";

interface Props {
  formData: Step2FormData;
  onChange: Step2ChangeHandler;
}

const YES_NO_OPTIONS = ["Yes", "No"];

const HOURS_PER_DAY_OPTIONS: LabeledOption[] = [
  { value: "1", label: "1 hour" },
  { value: "2", label: "2 hours" },
  { value: "3", label: "3 hours" },
  { value: "4", label: "4 hours" },
  { value: "5+", label: "5+ hours" },
];

export default function TeachingPreferencesSection({ formData, onChange }: Props) {
  return (
    <FormSection
      title="Teaching preferences"
      description="How you like to teach"
      icon={BookOpen}
    >
      <FormField label="Number of Students Taught" htmlFor="studentsTaught">
        <Input
          id="studentsTaught"
          name="studentsTaught"
          inputMode="numeric"
          placeholder="e.g. 25"
          value={formData.studentsTaught}
          onChange={onChange}
        />
      </FormField>

      <FormField label="Hours You Can Teach a Day" htmlFor="hoursPerDay">
        <LabeledSelect
          id="hoursPerDay"
          name="hoursPerDay"
          value={formData.hoursPerDay}
          placeholder="Select hours"
          options={HOURS_PER_DAY_OPTIONS}
          onChange={onChange}
        />
      </FormField>

      <FormField label="Do you have your own notes?" htmlFor="haveOwnNotes">
        <SelectField
          id="haveOwnNotes"
          name="haveOwnNotes"
          value={formData.haveOwnNotes}
          placeholder="Select one"
          options={YES_NO_OPTIONS}
          onChange={onChange}
        />
      </FormField>

      <FormField label="Can you make presentations?" htmlFor="canMakePresentations">
        <SelectField
          id="canMakePresentations"
          name="canMakePresentations"
          value={formData.canMakePresentations}
          placeholder="Select one"
          options={YES_NO_OPTIONS}
          onChange={onChange}
        />
      </FormField>

      <FormField label="Will you provide homework & tests?" htmlFor="provideHomework">
        <SelectField
          id="provideHomework"
          name="provideHomework"
          value={formData.provideHomework}
          placeholder="Select one"
          options={YES_NO_OPTIONS}
          onChange={onChange}
        />
      </FormField>

      <FormField label="Conduct parent-teacher meetings?" htmlFor="conductPTM">
        <SelectField
          id="conductPTM"
          name="conductPTM"
          value={formData.conductPTM}
          placeholder="Select one"
          options={YES_NO_OPTIONS}
          onChange={onChange}
        />
      </FormField>
    </FormSection>
  );
}
