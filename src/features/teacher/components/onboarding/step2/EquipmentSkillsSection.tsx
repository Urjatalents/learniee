import { Laptop } from "lucide-react";

import FormSection from "@/features/parent/components/onboarding/FormSection";
import CheckboxField from "@/features/teacher/components/onboarding/CheckboxField";
import type { Step2ChangeHandler, Step2FormData } from "@/features/teacher/types/step2";

interface Props {
  formData: Step2FormData;
  onChange: Step2ChangeHandler;
}

export default function EquipmentSkillsSection({ formData, onChange }: Props) {
  return (
    <FormSection
      title="Equipment & skills"
      description="Tick everything that applies"
      icon={Laptop}
    >
      <div className="sm:col-span-2 flex flex-wrap gap-x-8 gap-y-3">
        <CheckboxField
          name="hasLaptop"
          label="I have a Laptop"
          checked={formData.hasLaptop}
          onChange={onChange}
        />
        <CheckboxField
          name="hasPenTab"
          label="I have a PenTab"
          checked={formData.hasPenTab}
          onChange={onChange}
        />
        <CheckboxField
          name="proficientInEnglish"
          label="I am Proficient in English"
          checked={formData.proficientInEnglish}
          onChange={onChange}
        />
      </div>
    </FormSection>
  );
}
