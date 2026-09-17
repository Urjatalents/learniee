"use client";

import Link from "next/link";
import { ArrowLeft, SlidersHorizontal, Heart, HelpCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import SelectField from "@/features/shared/components/SelectField";

import FormSection from "@/features/parent/components/onboarding/FormSection";
import FormField from "@/features/parent/components/onboarding/FormField";
import { useParentStep3Form } from "@/features/parent/hooks/useParentStep3Form";
import {
  ONLINE_TUITION_OPTIONS,
  COMMUNICATION_MODE_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
  HOW_DID_YOU_HEAR_OPTIONS,
} from "@/features/parent/constants/onboardingOptions";

export default function Step3() {
  const {
    formData,
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Learning preferences" icon={SlidersHorizontal}>
          <FormField label="Current Tuition Status" htmlFor="childStatus" required>
            <Input
              id="childStatus"
              name="childStatus"
              placeholder="e.g. New to tuitions"
              value={formData.childStatus}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Prefer Online Tuition?" required>
            <SelectField
              name="onlineTuition"
              value={formData.onlineTuition}
              placeholder="Select preference"
              options={ONLINE_TUITION_OPTIONS}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Preferred Way to be Contacted" required>
            <SelectField
              name="modeOfCommunication"
              value={formData.modeOfCommunication}
              placeholder="Select mode"
              options={COMMUNICATION_MODE_OPTIONS}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Preferred Language" required>
            <SelectField
              name="preferredLanguage"
              value={formData.preferredLanguage}
              placeholder="Select language"
              options={PREFERRED_LANGUAGE_OPTIONS}
              onChange={handleChange}
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
          <FormField label="How Did You Hear About Learnie?">
            <SelectField
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
              className="w-full border rounded-md px-3 py-2 text-sm text-gray-600 placeholder:text-gray-400 resize-none"
            />
          </FormField>
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm py-2.5 w-full rounded-lg transition-colors disabled:opacity-60"
        >
          {submitting ? "Finishing up..." : "Finish"}
        </button>
      </form>
    </>
  );
}
