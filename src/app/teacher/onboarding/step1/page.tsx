"use client";

import { User, MapPin, Phone, Camera, ShieldCheck, UserCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import CountrySelect from "@/features/shared/components/CountrySelect";

import FormSection from "@/features/parent/components/onboarding/FormSection";
import FormField from "@/features/parent/components/onboarding/FormField";
import FormErrorBanner from "@/features/parent/components/onboarding/FormErrorBanner";
import OnboardingSubmitButton from "@/features/parent/components/onboarding/OnboardingSubmitButton";
import AutofilledBadge from "@/features/parent/components/onboarding/AutofilledBadge";

import DateOfBirthSelect from "@/features/teacher/components/onboarding/step1/DateOfBirthSelect";
import GenderSelect from "@/features/teacher/components/onboarding/step1/GenderSelect";
import CriminalCaseSelect from "@/features/teacher/components/onboarding/step1/CriminalCaseSelect";
import TeacherMediaPlaceholder from "@/features/teacher/components/onboarding/step1/TeacherMediaPlaceholder";
import { TEXTAREA_CLASSNAME } from "@/features/teacher/components/onboarding/styles";

import { useTeacherStep1Form } from "@/features/teacher/hooks/useTeacherStep1Form";

export default function TeacherStep1() {
  const {
    loading,
    submitting,
    error,
    formData,
    handleChange,
    handleSubmit,

    profilePhoto,
    introVideo,

    existingProfilePhoto,
    existingIntroVideo,

    handleProfilePhotoChange,
    handleIntroVideoChange,

    fileErrors,
  } = useTeacherStep1Form();

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-gray-500">Loading your information...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Personal Information</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tell us about yourself so parents and Learnie can get to know you.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection
          title="Your account"
          description="Taken from your signup — these can't be changed here"
          icon={UserCircle}
        >
          <FormField
            label="First Name"
            htmlFor="firstName"
            badge={<AutofilledBadge />}
          >
            <Input
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              disabled
            />
          </FormField>

          <FormField label="Last Name" htmlFor="lastName">
            <Input
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              disabled
            />
          </FormField>

          <FormField label="Email" htmlFor="email" fullWidth>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled
            />
          </FormField>
        </FormSection>

        <FormSection
          title="About you"
          description="How you'll appear to parents on Learnie"
          icon={User}
        >
          <FormField
            label="Display Name"
            htmlFor="visibleName"
            fullWidth
          >
            <Input
              id="visibleName"
              name="visibleName"
              placeholder="e.g. Priya Sharma"
              value={formData.visibleName}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Date of Birth">
            <DateOfBirthSelect
              day={formData.dobDay}
              month={formData.dobMonth}
              year={formData.dobYear}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Gender" htmlFor="gender">
            <GenderSelect value={formData.gender} onChange={handleChange} />
          </FormField>

          <FormField label="Nationality" htmlFor="nationality">
            <CountrySelect
              id="nationality"
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              placeholder="Select nationality"
            />
          </FormField>

          <FormField
            label="About Me"
            htmlFor="aboutMe"
            helperText="A short introduction parents will see on your profile."
            fullWidth
          >
            <textarea
              id="aboutMe"
              name="aboutMe"
              rows={4}
              placeholder="Tell parents about your teaching style and experience"
              value={formData.aboutMe}
              onChange={handleChange}
              className={TEXTAREA_CLASSNAME}
            />
          </FormField>
        </FormSection>

        <FormSection
          title="Location"
          description="Used to understand where you teach from"
          icon={MapPin}
        >
          <FormField label="Address" htmlFor="address" fullWidth>
            <Input
              id="address"
              name="address"
              placeholder="House / street / area"
              value={formData.address}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="City" htmlFor="city">
            <Input
              id="city"
              name="city"
              placeholder="e.g. Mumbai"
              value={formData.city}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Pincode" htmlFor="pincode">
            <Input
              id="pincode"
              name="pincode"
              inputMode="numeric"
              placeholder="e.g. 400001"
              value={formData.pincode}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Country" htmlFor="country">
            <CountrySelect
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Select country"
            />
          </FormField>
        </FormSection>

        <FormSection title="Contact" icon={Phone}>
          <FormField label="Phone" htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="Phone number"
              value={formData.phone}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="WhatsApp Number" htmlFor="whatsapp">
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              placeholder="WhatsApp number"
              value={formData.whatsapp}
              onChange={handleChange}
            />
          </FormField>
        </FormSection>

        <FormSection
          title="Photo & video"
          description="Your video introduction is the first thing parents see"
          icon={Camera}
        >
          <div className="sm:col-span-2">
            <TeacherMediaPlaceholder
              profilePhoto={profilePhoto}
              introVideo={introVideo}
              existingProfilePhoto={existingProfilePhoto}
              existingIntroVideo={existingIntroVideo}
              onProfilePhotoChange={handleProfilePhotoChange}
              onIntroVideoChange={handleIntroVideoChange}
              errors={fileErrors}
            />
          </div>
        </FormSection>

        <FormSection title="Background check" icon={ShieldCheck}>
          <FormField
            label="Criminal Court Case"
            htmlFor="criminalCase"
            helperText="Optional"
          >
            <CriminalCaseSelect
              value={formData.criminalCase}
              onChange={handleChange}
            />
          </FormField>
        </FormSection>

        {error && <FormErrorBanner message={error} />}

        <OnboardingSubmitButton
          submitting={submitting}
          label="Continue"
          submittingLabel="Uploading..."
        />
      </form>
    </>
  );
}
