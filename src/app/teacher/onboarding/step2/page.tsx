"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useTeacherStep2Form } from "@/features/teacher/hooks/useTeacherStep2Form";
import ProfessionalBackgroundSection from "@/features/teacher/components/onboarding/step2/ProfessionalBackgroundSection";
import CurrentWorkSection from "@/features/teacher/components/onboarding/step2/CurrentWorkSection";
import TeachingPreferencesSection from "@/features/teacher/components/onboarding/step2/TeachingPreferencesSection";
import EquipmentSkillsSection from "@/features/teacher/components/onboarding/step2/EquipmentSkillsSection";
import AdditionalInfoAndSocialSection from "@/features/teacher/components/onboarding/step2/AdditionalInfoAndSocialSection";

import FormErrorBanner from "@/features/parent/components/onboarding/FormErrorBanner";
import OnboardingSubmitButton from "@/features/parent/components/onboarding/OnboardingSubmitButton";

export default function TeacherStep2() {
  const {
    formData,
    loading,
    saving,
    error,
    handleChange,
    handleSubmit,

    certificationFiles,
    awardFiles,

    existingCertificationFiles,
    existingAwardFiles,

    setCertificationFiles,
    setAwardFiles,

    certificationError,
    awardError,
  } = useTeacherStep2Form();

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-gray-500">
          Loading professional information...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <Link
          href="/teacher/onboarding/step1"
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-violet-600 mb-3"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Professional Information
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Tell us about your teaching background and how you like to teach.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <ProfessionalBackgroundSection
          formData={formData}
          onChange={handleChange}
          certificationFiles={certificationFiles}
          awardFiles={awardFiles}
          existingCertificationFiles={existingCertificationFiles}
          existingAwardFiles={existingAwardFiles}
          onCertificationChange={setCertificationFiles}
          onAwardChange={setAwardFiles}
          certificationError={certificationError}
          awardError={awardError}
        />

        <CurrentWorkSection formData={formData} onChange={handleChange} />

        <TeachingPreferencesSection formData={formData} onChange={handleChange} />

        <EquipmentSkillsSection formData={formData} onChange={handleChange} />

        <AdditionalInfoAndSocialSection
          formData={formData}
          onChange={handleChange}
        />

        {error && <FormErrorBanner message={error} />}

        <OnboardingSubmitButton
          submitting={saving}
          label="Continue"
          submittingLabel="Saving..."
        />
      </form>
    </>
  );
}
