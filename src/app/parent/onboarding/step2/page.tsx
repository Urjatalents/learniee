"use client";

import Link from "next/link";
import { ArrowLeft, User, BookOpen } from "lucide-react";

import { Input } from "@/components/ui/input";
import SelectField from "@/features/shared/components/SelectField";

import FormSection from "@/features/parent/components/onboarding/FormSection";
import FormField from "@/features/parent/components/onboarding/FormField";
import FormErrorBanner from "@/features/parent/components/onboarding/FormErrorBanner";
import OnboardingSubmitButton from "@/features/parent/components/onboarding/OnboardingSubmitButton";
import ChildPhotoUpload from "@/features/parent/components/onboarding/step2/ChildPhotoUpload";
import { useParentStep2Form } from "@/features/parent/hooks/useParentStep2Form";
import { GENDER_OPTIONS, STANDARD_OPTIONS, BOARD_OPTIONS } from "@/features/parent/constants/onboardingOptions";

const TEXTAREA_CLASSNAME =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm resize-none";

export default function Step2() {
  const {
    formData,
    errors,
    photo,
    photoError,
    submitting,
    error,
    handleChange,
    handlePhotoSelect,
    handleSubmit,
  } = useParentStep2Form();

  return (
    <>
      <div className="mb-8">
        <Link
          href="/parent/onboarding/step1"
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-violet-600 mb-3"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Child Information</h1>
        <p className="text-sm text-gray-500 mt-1">
          A few details about the child who&apos;ll be learning on Learnie.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection title="Basic details" icon={User}>
          <FormField
            label="First Name"
            htmlFor="firstName"
            required
            error={errors.firstName}
          >
            <Input
              id="firstName"
              name="firstName"
              placeholder="e.g. Aarav"
              value={formData.firstName}
              onChange={handleChange}
              aria-invalid={!!errors.firstName}
              required
            />
          </FormField>

          <FormField
            label="Last Name"
            htmlFor="lastName"
            required
            error={errors.lastName}
          >
            <Input
              id="lastName"
              name="lastName"
              placeholder="e.g. Sharma"
              value={formData.lastName}
              onChange={handleChange}
              aria-invalid={!!errors.lastName}
              required
            />
          </FormField>

          <FormField
            label="Display Name"
            htmlFor="visibleName"
            required
            helperText="Shown to teachers instead of the full legal name"
            error={errors.visibleName}
          >
            <Input
              id="visibleName"
              name="visibleName"
              placeholder="e.g. Aarav S."
              value={formData.visibleName}
              onChange={handleChange}
              aria-invalid={!!errors.visibleName}
              required
            />
          </FormField>

          <FormField label="Gender" htmlFor="gender" required error={errors.gender}>
            <SelectField
              id="gender"
              name="gender"
              value={formData.gender}
              placeholder="Select gender"
              options={GENDER_OPTIONS}
              onChange={handleChange}
              aria-invalid={!!errors.gender}
            />
          </FormField>

          <FormField label="Age" htmlFor="age" required error={errors.age}>
            <Input
              id="age"
              name="age"
              type="number"
              inputMode="numeric"
              min={1}
              max={25}
              placeholder="e.g. 10"
              value={formData.age}
              onChange={handleChange}
              aria-invalid={!!errors.age}
              required
            />
          </FormField>
        </FormSection>

        <FormSection title="School" icon={BookOpen}>
          <FormField
            label="Standard / Grade"
            htmlFor="standard"
            required
            error={errors.standard}
          >
            <SelectField
              id="standard"
              name="standard"
              value={formData.standard}
              placeholder="Select standard"
              options={STANDARD_OPTIONS}
              onChange={handleChange}
              aria-invalid={!!errors.standard}
            />
          </FormField>

          <FormField label="Board" htmlFor="board" required error={errors.board}>
            <SelectField
              id="board"
              name="board"
              value={formData.board}
              placeholder="Select board"
              options={BOARD_OPTIONS}
              onChange={handleChange}
              aria-invalid={!!errors.board}
            />
          </FormField>

          <FormField
            label="Current School Name"
            htmlFor="currentSchoolName"
            required
            fullWidth
            error={errors.currentSchoolName}
          >
            <Input
              id="currentSchoolName"
              name="currentSchoolName"
              placeholder="e.g. Delhi Public School"
              value={formData.currentSchoolName}
              onChange={handleChange}
              aria-invalid={!!errors.currentSchoolName}
              required
            />
          </FormField>

          <FormField
            label="Learning Difficulties"
            htmlFor="learningDifficulties"
            helperText="Optional — helps teachers plan lessons. Leave blank if none."
            fullWidth
          >
            <textarea
              id="learningDifficulties"
              name="learningDifficulties"
              rows={2}
              placeholder="e.g. Dyslexia, ADHD, none"
              value={formData.learningDifficulties}
              onChange={handleChange}
              className={TEXTAREA_CLASSNAME}
            />
          </FormField>

          <ChildPhotoUpload photo={photo} error={photoError} onSelect={handlePhotoSelect} />
        </FormSection>

        {error && <FormErrorBanner message={error} />}

        <OnboardingSubmitButton submitting={submitting} label="Continue" submittingLabel="Uploading..." />
      </form>
    </>
  );
}
