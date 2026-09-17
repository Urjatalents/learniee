"use client";

import { User, MapPin, Phone } from "lucide-react";

import { Input } from "@/components/ui/input";
import CountrySelect from "@/features/shared/components/CountrySelect";
import SelectField from "@/features/shared/components/SelectField";
import PhoneInput from "@/features/auth/components/signup/PhoneInput";

import FormSection from "@/features/parent/components/onboarding/FormSection";
import FormField from "@/features/parent/components/onboarding/FormField";
import { useParentStep1Form } from "@/features/parent/hooks/useParentStep1Form";
import {
  TUITION_TYPE_OPTIONS,
  NRI_OR_INDIAN_OPTIONS,
  RELATION_TO_STUDENT_OPTIONS,
  CURRENCY_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/features/parent/constants/onboardingOptions";

export default function Step1() {
  const { formData, submitting, error, handleChange, handleWhatsappChange, handleSubmit } =
    useParentStep1Form();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Parent Information</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tell us a bit about yourself so teachers and Learnie can reach you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection
          title="About you"
          description="How you'll appear to teachers on Learnie"
          icon={User}
        >
          <FormField label="Display Name" htmlFor="visibleName" required fullWidth>
            <Input
              id="visibleName"
              name="visibleName"
              placeholder="e.g. Priya Sharma"
              value={formData.visibleName}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Nationality" htmlFor="nationality" required>
            <Input
              id="nationality"
              name="nationality"
              placeholder="e.g. Indian"
              value={formData.nationality}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Indian or NRI" required>
            <SelectField
              name="nriOrIndian"
              value={formData.nriOrIndian}
              placeholder="Select one"
              options={NRI_OR_INDIAN_OPTIONS}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Relation to Student" required>
            <SelectField
              name="relationToStudent"
              value={formData.relationToStudent}
              placeholder="Select relation"
              options={RELATION_TO_STUDENT_OPTIONS}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Preferred Tuition Type" required>
            <SelectField
              name="tuitionType"
              value={formData.tuitionType}
              placeholder="Select tuition type"
              options={TUITION_TYPE_OPTIONS}
              onChange={handleChange}
            />
          </FormField>
        </FormSection>

        <FormSection
          title="Location"
          description="Used to match you with nearby or timezone-friendly teachers"
          icon={MapPin}
        >
          <FormField label="Address" htmlFor="address" required fullWidth>
            <Input
              id="address"
              name="address"
              placeholder="House / street / area"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="City" htmlFor="city" required>
            <Input
              id="city"
              name="city"
              placeholder="e.g. Mumbai"
              value={formData.city}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Pincode" htmlFor="pincode" required>
            <Input
              id="pincode"
              name="pincode"
              inputMode="numeric"
              placeholder="e.g. 400001"
              value={formData.pincode}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Country" required>
            <CountrySelect
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Timezone" required>
            <SelectField
              name="timezone"
              value={formData.timezone}
              placeholder="Select timezone"
              options={TIMEZONE_OPTIONS}
              onChange={handleChange}
            />
          </FormField>
        </FormSection>

        <FormSection title="Contact & billing" icon={Phone}>
          <FormField label="WhatsApp Number" required>
            <PhoneInput value={formData.whatsappNumber} onChange={handleWhatsappChange} />
          </FormField>

          <FormField label="Preferred Currency" required>
            <SelectField
              name="currency"
              value={formData.currency}
              placeholder="Select currency"
              options={CURRENCY_OPTIONS}
              onChange={handleChange}
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm py-2.5 w-full rounded-lg transition-colors disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Continue"}
        </button>
      </form>
    </>
  );
}
