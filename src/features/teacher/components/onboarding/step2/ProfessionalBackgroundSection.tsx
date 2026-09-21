import { Briefcase, Award } from "lucide-react";

import { Input } from "@/components/ui/input";
import FormSection from "@/features/parent/components/onboarding/FormSection";
import FormField from "@/features/parent/components/onboarding/FormField";
import LabeledSelect, {
  type LabeledOption,
} from "@/features/teacher/components/onboarding/LabeledSelect";
import type {
  Step2ChangeHandler,
  Step2FormData,
} from "@/features/teacher/types/step2";

import CertificationUpload from "@/features/teacher/components/onboarding/step2/CertificationUpload";
import AwardUpload from "@/features/teacher/components/onboarding/step2/AwardUpload";

export interface ExistingTeacherFile {
  id: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

interface Props {
  formData: Step2FormData;
  onChange: Step2ChangeHandler;

  certificationFiles: File[];
  awardFiles: File[];

  existingCertificationFiles: ExistingTeacherFile[];
  existingAwardFiles: ExistingTeacherFile[];

  onCertificationChange: (files: File[]) => void;
  onAwardChange: (files: File[]) => void;

  certificationError?: string;
  awardError?: string;
}

const REFERRED_BY_OPTIONS: LabeledOption[] = [
  { value: "website", label: "Website" },
  { value: "friend", label: "Friend" },
  { value: "social_media", label: "Social Media" },
  { value: "other", label: "Other" },
];

const EXPERIENCE_OPTIONS: LabeledOption[] = [
  { value: "0", label: "Less than 1 year" },
  { value: "1-3", label: "1-3 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "5-10", label: "5-10 years" },
  { value: "10+", label: "10+ years" },
];

export default function ProfessionalBackgroundSection({
  formData,
  onChange,

  certificationFiles,
  awardFiles,

  existingCertificationFiles,
  existingAwardFiles,

  onCertificationChange,
  onAwardChange,

  certificationError,
  awardError,
}: Props) {
  return (
    <>
      <FormSection
        title="Professional background"
        description="Your qualifications and teaching experience"
        icon={Briefcase}
      >
        <FormField label="Referred By" htmlFor="referredBy">
          <LabeledSelect
            id="referredBy"
            name="referredBy"
            value={formData.referredBy}
            placeholder="How did you hear about us?"
            options={REFERRED_BY_OPTIONS}
            onChange={onChange}
          />
        </FormField>

        <FormField label="Qualifications" htmlFor="qualifications">
          <Input
            id="qualifications"
            name="qualifications"
            placeholder="e.g. B.Ed, M.Sc Mathematics"
            value={formData.qualifications}
            onChange={onChange}
          />
        </FormField>

        <FormField label="Overall Teaching Experience" htmlFor="overallExperience">
          <LabeledSelect
            id="overallExperience"
            name="overallExperience"
            value={formData.overallExperience}
            placeholder="Select experience"
            options={EXPERIENCE_OPTIONS}
            onChange={onChange}
          />
        </FormField>

        <FormField label="Comfortable Language" htmlFor="comfortableLanguage">
          <Input
            id="comfortableLanguage"
            name="comfortableLanguage"
            placeholder="e.g. English, Hindi"
            value={formData.comfortableLanguage}
            onChange={onChange}
          />
        </FormField>

        <FormField
          label="Schools You Taught Before"
          htmlFor="schoolsTaught"
          fullWidth
        >
          <Input
            id="schoolsTaught"
            name="schoolsTaught"
            placeholder="School names, separated by commas"
            value={formData.schoolsTaught}
            onChange={onChange}
          />
        </FormField>
      </FormSection>

      <FormSection
        title="Certifications & awards"
        description="Upload anything that supports your experience"
        icon={Award}
      >
        <CertificationUpload
          files={certificationFiles}
          existingFiles={existingCertificationFiles}
          onChange={onCertificationChange}
          error={certificationError}
        />

        <AwardUpload
          files={awardFiles}
          existingFiles={existingAwardFiles}
          onChange={onAwardChange}
          error={awardError}
        />
      </FormSection>
    </>
  );
}
