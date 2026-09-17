"use client";

import Link from "next/link";
import { ArrowLeft, SlidersHorizontal, Heart, HelpCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import SelectField from "@/features/shared/components/SelectField";

import FormSection from "@/features/parent/components/onboarding/FormSection";
import FormField from "@/features/parent/components/onboarding/FormField";
import FormErrorBanner from "@/features/parent/components/onboarding/FormErrorBanner";
import OnboardingSubmitButton from "@/features/parent/components/onboarding/OnboardingSubmitButton";
import { useParentStep3Form } from "@/features/parent/hooks/useParentStep3Form";
import {
  ONLINE_TUITION_OPTIONS,
  COMMUNICATION_MODE_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
  HOW_DID_YOU_HEAR_OPTIONS,
} from "@/features/parent/constants/onboardingOptions";

const TEXTAREA_CLASSNAME =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm resize-none";

export default function Step3() {
  const {
    formData,
    errors,
    suggestions,
    setSuggestions,
    submitting,
    error,
    handleChange,
    handleSubmit,
  } = useParentStep3Form();

  return (
    <>
      <div className="mb-6">
        <Link
          href="/parent/onboarding/step2"
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-violet-600 mb-3"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Additional Information</h1>
        <p className="text-sm text-gray-500 mt-1">
          Last step — this helps us recommend the right teachers and courses.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection title="Learning preferences" icon={SlidersHorizontal}>
          <FormField
            label="Current Tuition Status"
            htmlFor="childStatus"
            required
            error={errors.childStatus}
          >
            <Input
              id="childStatus"
              name="childStatus"
              placeholder="e.g. New to tuitions"
              value={formData.childStatus}
              onChange={handleChange}
              aria-invalid={!!errors.childStatus}
              required
            />
          </FormField>

          <FormField
            label="Prefer Online Tuition?"
            htmlFor="onlineTuition"
            required
            error={errors.onlineTuition}
          >
            <SelectField
              id="onlineTuition"
              name="onlineTuition"
              value={formData.onlineTuition}
              placeholder="Select preference"
              options={ONLINE_TUITION_OPTIONS}
              onChange={handleChange}
              aria-invalid={!!errors.onlineTuition}
            />
          </FormField>

          <FormField
            label="Preferred Way to be Contacted"
            htmlFor="modeOfCommunication"
            required
            error={errors.modeOfCommunication}
          >
            <SelectField
              id="modeOfCommunication"
              name="modeOfCommunication"
              value={formData.modeOfCommunication}
              placeholder="Select mode"
              options={COMMUNICATION_MODE_OPTIONS}
              onChange={handleChange}
              aria-invalid={!!errors.modeOfCommunication}
            />
          </FormField>

          <FormField
            label="Preferred Language"
            htmlFor="preferredLanguage"
            required
            error={errors.preferredLanguage}
          >
            <SelectField
              id="preferredLanguage"
              name="preferredLanguage"
              value={formData.preferredLanguage}
              placeholder="Select language"
              options={PREFERRED_LANGUAGE_OPTIONS}
              onChange={handleChange}
              aria-invalid={!!errors.preferredLanguage}
            />
          </FormField>
        </FormSection>

        <FormSection
          title="About the child"
          description="Optional, but helps teachers personalize lessons"
          icon={Heart}
        >
          <FormField label="Child's Interests" htmlFor="childInterest">
            <Input
              id="childInterest"
              name="childInterest"
              placeholder="e.g. Football, painting"
              value={formData.childInterest}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Favorite Subject" htmlFor="favoriteSubject">
            <Input
              id="favoriteSubject"
              name="favoriteSubject"
              placeholder="e.g. Mathematics"
              value={formData.favoriteSubject}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Subject Needing Most Help" htmlFor="weakSubject" fullWidth>
            <Input
              id="weakSubject"
              name="weakSubject"
              placeholder="e.g. Science"
              value={formData.weakSubject}
              onChange={handleChange}
            />
          </FormField>
        </FormSection>

        <FormSection title="Anything else" icon={HelpCircle}>
          <FormField label="How Did You Hear About Learnie?" htmlFor="howDidYouHear">
            <SelectField
              id="howDidYouHear"
              name="howDidYouHear"
              value={formData.howDidYouHear}
              placeholder="Select an option"
              options={HOW_DID_YOU_HEAR_OPTIONS}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Suggestions" htmlFor="suggestions" fullWidth>
            <textarea
              id="suggestions"
              rows={3}
              placeholder="Anything you'd like us to know?"
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              className={TEXTAREA_CLASSNAME}
            />
          </FormField>
        </FormSection>

        {error && <FormErrorBanner message={error} />}

        <OnboardingSubmitButton submitting={submitting} label="Finish" submittingLabel="Finishing up..." />
      </form>
    </>
  );
}
