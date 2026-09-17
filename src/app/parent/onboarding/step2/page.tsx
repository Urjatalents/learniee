"use client";

import Link from "next/link";
import { ArrowLeft, User, BookOpen } from "lucide-react";

import { Input } from "@/components/ui/input";
import SelectField from "@/features/shared/components/SelectField";

import FormSection from "@/features/parent/components/onboarding/FormSection";
import FormField from "@/features/parent/components/onboarding/FormField";
import ChildPhotoUpload from "@/features/parent/components/onboarding/step2/ChildPhotoUpload";
import { useParentStep2Form } from "@/features/parent/hooks/useParentStep2Form";
import { GENDER_OPTIONS, STANDARD_OPTIONS, BOARD_OPTIONS } from "@/features/parent/constants/onboardingOptions";

export default function Step2() {
  const {
    formData,
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
      <div className="mb-6">
        <Link
          href="/parent/onboarding/step1"
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-violet-600 mb-3"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Child Information</h1>
        <p className="text-sm text-gray-500 mt-1">
          A few details about the child who&apos;ll be learning on Learnie.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Basic details" icon={User}>
          <FormField label="First Name" htmlFor="firstName" required>
            <Input
              id="firstName"
              name="firstName"
              placeholder="e.g. Aarav"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Last Name" htmlFor="lastName" required>
            <Input
              id="lastName"
              name="lastName"
              placeholder="e.g. Sharma"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField
            label="Display Name"
            htmlFor="visibleName"
            required
            helperText="Shown to teachers instead of the full legal name"
          >
            <Input
              id="visibleName"
              name="visibleName"
              placeholder="e.g. Aarav S."
              value={formData.visibleName}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Gender" required>
            <SelectField
              name="gender"
              value={formData.gender}
              placeholder="Select gender"
              options={GENDER_OPTIONS}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Age" htmlFor="age" required>
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
              required
            />
          </FormField>
        </FormSection>

        <FormSection title="School" icon={BookOpen}>
          <FormField label="Standard / Grade" required>
            <SelectField
              name="standard"
              value={formData.standard}
              placeholder="Select standard"
              options={STANDARD_OPTIONS}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Board" required>
            <SelectField
              name="board"
              value={formData.board}
              placeholder="Select board"
              options={BOARD_OPTIONS}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Current School Name" htmlFor="currentSchoolName" required fullWidth>
            <Input
              id="currentSchoolName"
              name="currentSchoolName"
              placeholder="e.g. Delhi Public School"
              value={formData.currentSchoolName}
              onChange={handleChange}
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
              className="w-full border rounded-md px-3 py-2 text-sm text-gray-600 placeholder:text-gray-400 resize-none"
            />
          </FormField>

          <ChildPhotoUpload photo={photo} error={photoError} onSelect={handlePhotoSelect} />
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm py-2.5 w-full rounded-lg transition-colors disabled:opacity-60"
        >
          {submitting ? "Uploading..." : "Continue"}
        </button>
      </form>
    </>
  );
}
