"use client";

import Link from "next/link";
import { ArrowLeft, FileText, CreditCard } from "lucide-react";

import { Input } from "@/components/ui/input";
import FormSection from "@/features/parent/components/onboarding/FormSection";
import FormField from "@/features/parent/components/onboarding/FormField";
import FormErrorBanner from "@/features/parent/components/onboarding/FormErrorBanner";
import OnboardingSubmitButton from "@/features/parent/components/onboarding/OnboardingSubmitButton";
import DocumentUpload from "@/features/teacher/components/onboarding/step3/DocumentUpload";
import { useTeacherStep3Form } from "@/features/teacher/hooks/useTeacherStep3Form";
import {
  DOCUMENT_SLOTS,
  STEP3_ACCEPTED_TYPES,
  STEP3_MAX_FILE_SIZE_MB,
} from "@/features/teacher/types/step3";

export default function TeacherStep3() {
  const {
    panCardNumber,
    setPanCardNumber,
    files,
    fileErrors,
    handleFileSelect,
    submitting,
    submitError,
    handleSubmit,
  } = useTeacherStep3Form();

  return (
    <>
      <div className="mb-8">
        <Link
          href="/teacher/onboarding/step2"
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-violet-600 mb-3"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your documents so our team can verify your profile.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection
          title="Proof documents"
          description="PNG, JPG or PDF"
          icon={FileText}
        >
          {DOCUMENT_SLOTS.map(({ key, label }) => (
            <div key={key} className="sm:col-span-2">
              <DocumentUpload
                id={`file-${key}`}
                label={label}
                file={files[key]}
                error={fileErrors[key]}
                acceptedTypes={STEP3_ACCEPTED_TYPES}
                maxFileSizeMB={STEP3_MAX_FILE_SIZE_MB}
                onChange={(file) => handleFileSelect(key, file)}
              />
            </div>
          ))}
        </FormSection>

        <FormSection title="Tax details" icon={CreditCard}>
          <FormField label="PAN Card Number" htmlFor="panCardNumber">
            <Input
              id="panCardNumber"
              name="panCardNumber"
              placeholder="Enter PAN card number"
              value={panCardNumber}
              onChange={(e) => setPanCardNumber(e.target.value.toUpperCase())}
            />
          </FormField>
        </FormSection>

        {submitError && <FormErrorBanner message={submitError} />}

        <OnboardingSubmitButton
          submitting={submitting}
          label="Submit"
          submittingLabel="Uploading..."
        />
      </form>
    </>
  );
}
