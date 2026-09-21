import { Globe } from "lucide-react";

import { Input } from "@/components/ui/input";
import FormSection from "@/features/parent/components/onboarding/FormSection";
import FormField from "@/features/parent/components/onboarding/FormField";
import CheckboxField from "@/features/teacher/components/onboarding/CheckboxField";
import { TEXTAREA_CLASSNAME } from "@/features/teacher/components/onboarding/styles";
import type { Step2ChangeHandler, Step2FormData } from "@/features/teacher/types/step2";

interface Props {
  formData: Step2FormData;
  onChange: Step2ChangeHandler;
}

export default function AdditionalInfoAndSocialSection({ formData, onChange }: Props) {
  return (
    <FormSection
      title="Additional info & social links"
      description="All optional"
      icon={Globe}
    >
      <FormField
        label="Anything else you'd like to share with us?"
        htmlFor="additionalInfo"
        helperText="Optional"
        fullWidth
      >
        <textarea
          id="additionalInfo"
          name="additionalInfo"
          rows={4}
          placeholder="Type..."
          value={formData.additionalInfo}
          onChange={onChange}
          className={TEXTAREA_CLASSNAME}
        />
      </FormField>

      <FormField label="Facebook" htmlFor="facebook">
        <Input
          id="facebook"
          name="facebook"
          placeholder="Profile link"
          value={formData.facebook}
          onChange={onChange}
        />
      </FormField>

      <FormField label="LinkedIn" htmlFor="linkedin">
        <Input
          id="linkedin"
          name="linkedin"
          placeholder="Profile link"
          value={formData.linkedin}
          onChange={onChange}
        />
      </FormField>

      <FormField label="Instagram" htmlFor="instagram">
        <Input
          id="instagram"
          name="instagram"
          placeholder="Profile link"
          value={formData.instagram}
          onChange={onChange}
        />
      </FormField>

      <FormField label="YouTube" htmlFor="youtube">
        <Input
          id="youtube"
          name="youtube"
          placeholder="Channel link"
          value={formData.youtube}
          onChange={onChange}
        />
      </FormField>

      <div className="sm:col-span-2 border-t border-gray-200 pt-5">
        <CheckboxField
          name="notWithOtherAcademy"
          label="I am not working with any other academy"
          checked={formData.notWithOtherAcademy}
          onChange={onChange}
        />
      </div>
    </FormSection>
  );
}
