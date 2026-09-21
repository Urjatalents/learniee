import { Building2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import FormSection from "@/features/parent/components/onboarding/FormSection";
import CheckboxField from "@/features/teacher/components/onboarding/CheckboxField";
import type { Step2ChangeHandler, Step2FormData } from "@/features/teacher/types/step2";

interface Props {
  formData: Step2FormData;
  onChange: Step2ChangeHandler;
}

export default function CurrentWorkSection({ formData, onChange }: Props) {
  return (
    <FormSection
      title="Current work"
      description="Where you teach right now, if anywhere"
      icon={Building2}
    >
      <div className="space-y-2">
        <CheckboxField
          name="workingInSchool"
          label="Working in a School"
          checked={formData.workingInSchool}
          onChange={onChange}
        />
        <Input
          name="schoolName"
          aria-label="School Name"
          placeholder="School Name"
          value={formData.schoolName}
          disabled={!formData.workingInSchool}
          onChange={onChange}
        />
      </div>

      <div className="space-y-2">
        <CheckboxField
          name="workingInAcademy"
          label="Working in an Academy"
          checked={formData.workingInAcademy}
          onChange={onChange}
        />
        <Input
          name="academyName"
          aria-label="Academy Name"
          placeholder="Academy Name"
          value={formData.academyName}
          disabled={!formData.workingInAcademy}
          onChange={onChange}
        />
      </div>
    </FormSection>
  );
}
