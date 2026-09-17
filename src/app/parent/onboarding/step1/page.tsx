"use client";

import { User, MapPin, Phone } from "lucide-react";

import { Input } from "@/components/ui/input";
import CountrySelect from "@/features/shared/components/CountrySelect";
import SelectField from "@/features/shared/components/SelectField";
import PhoneInput from "@/features/auth/components/signup/PhoneInput";

import FormSection from "@/features/parent/components/onboarding/FormSection";
import FormField from "@/features/parent/components/onboarding/FormField";
import FormErrorBanner from "@/features/parent/components/onboarding/FormErrorBanner";
import OnboardingSubmitButton from "@/features/parent/components/onboarding/OnboardingSubmitButton";
import { useParentStep1Form } from "@/features/parent/hooks/useParentStep1Form";
import {
  TUITION_TYPE_OPTIONS,
  NRI_OR_INDIAN_OPTIONS,
  RELATION_TO_STUDENT_OPTIONS,
  CURRENCY_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/features/parent/constants/onboardingOptions";

export default function Step1() {
  const { formData, errors, submitting, error, handleChange, handleWhatsappChange, handleSubmit } =
    useParentStep1Form();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Parent Information</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tell us a bit about yourself so teachers and Learnie can reach you.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection
          title="About you"
          description="How you'll appear to teachers on Learnie"
          icon={User}
        >
          <FormField
            label="Display Name"
            htmlFor="visibleName"
            required
            fullWidth
            error={errors.visibleName}
          >
            <Input
              id="visibleName"
              name="visibleName"
              placeholder="e.g. Priya Sharma"
              value={formData.visibleName}
              onChange={handleChange}
              aria-invalid={!!errors.visibleName}
              required
            />
          </FormField>

          <FormField
            label="Nationality"
            htmlFor="nationality"
            required
            error={errors.nationality}
          >
            <Input
              id="nationality"
              name="nationality"
              placeholder="e.g. Indian"
              value={formData.nationality}
              onChange={handleChange}
              aria-invalid={!!errors.nationality}
              required
            />
          </FormField>

          <FormField
            label="Indian or NRI"
            htmlFor="nriOrIndian"
            required
            error={errors.nriOrIndian}
          >
            <SelectField
              id="nriOrIndian"
              name="nriOrIndian"
              value={formData.nriOrIndian}
              placeholder="Select one"
              options={NRI_OR_INDIAN_OPTIONS}
              onChange={handleChange}
              aria-invalid={!!errors.nriOrIndian}
            />
          </FormField>

          <FormField
            label="Relation to Student"
            htmlFor="relationToStudent"
            required
            error={errors.relationToStudent}
          >
            <SelectField
              id="relationToStudent"
              name="relationToStudent"
              value={formData.relationToStudent}
              placeholder="Select relation"
              options={RELATION_TO_STUDENT_OPTIONS}
              onChange={handleChange}
              aria-invalid={!!errors.relationToStudent}
            />
          </FormField>

          <FormField
            label="Preferred Tuition Type"
            htmlFor="tuitionType"
            required
            error={errors.tuitionType}
          >
            <SelectField
              id="tuitionType"
              name="tuitionType"
              value={formData.tuitionType}
              placeholder="Select tuition type"
              options={TUITION_TYPE_OPTIONS}
              onChange={handleChange}
              aria-invalid={!!errors.tuitionType}
            />
          </FormField>
        </FormSection>

        <FormSection
          title="Location"
          description="Used to match you with nearby or timezone-friendly teachers"
          icon={MapPin}
        >
          <FormField
            label="Address"
            htmlFor="address"
            required
            fullWidth
            error={errors.address}
          >
            <Input
              id="address"
              name="address"
              placeholder="House / street / area"
              value={formData.address}
              onChange={handleChange}
              aria-invalid={!!errors.address}
              required
            />
          </FormField>

          <FormField label="City" htmlFor="city" required error={errors.city}>
            <Input
              id="city"
              name="city"
              placeholder="e.g. Mumbai"
              value={formData.city}
              onChange={handleChange}
              aria-invalid={!!errors.city}
              required
            />
          </FormField>

          <FormField
            label="Pincode"
            htmlFor="pincode"
            required
            error={errors.pincode}
          >
            <Input
              id="pincode"
              name="pincode"
              inputMode="numeric"
              placeholder="e.g. 400001"
              value={formData.pincode}
              onChange={handleChange}
              aria-invalid={!!errors.pincode}
              required
            />
          </FormField>

          <FormField
            label="Country"
            htmlFor="country"
            required
            error={errors.country}
          >
            <CountrySelect
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              aria-invalid={!!errors.country}
              required
            />
          </FormField>

          <FormField
            label="Timezone"
            htmlFor="timezone"
            required
            error={errors.timezone}
          >
            <SelectField
              id="timezone"
              name="timezone"
              value={formData.timezone}
              placeholder="Select timezone"
              options={TIMEZONE_OPTIONS}
              onChange={handleChange}
              aria-invalid={!!errors.timezone}
            />
          </FormField>
        </FormSection>

        <FormSection title="Contact & billing" icon={Phone}>
          <FormField label="WhatsApp Number" required>
            <div
              className="onboarding-phone-input"
              data-invalid={!!errors.whatsappNumber}
            >
              <PhoneInput
                value={formData.whatsappNumber}
                onChange={handleWhatsappChange}
                error={errors.whatsappNumber}
              />
            </div>
          </FormField>

          <FormField
            label="Preferred Currency"
            htmlFor="currency"
            required
            error={errors.currency}
          >
            <SelectField
              id="currency"
              name="currency"
              value={formData.currency}
              placeholder="Select currency"
              options={CURRENCY_OPTIONS}
              onChange={handleChange}
              aria-invalid={!!errors.currency}
            />
          </FormField>

          <FormField label="Referral Code" htmlFor="referredByCode">
            <Input
              id="referredByCode"
              name="referredByCode"
              placeholder="Have a code from a friend? Enter it here"
              value={formData.referredByCode}
              onChange={handleChange}
            />
          </FormField>
        </FormSection>

        {error && <FormErrorBanner message={error} />}

        <OnboardingSubmitButton submitting={submitting} label="Continue" submittingLabel="Saving..." />
      </form>
    </>
  );
}
