"use client";

import SelectField from "@/features/shared/components/SelectField";

interface GenderSelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

export default function GenderSelect({ value, onChange }: GenderSelectProps) {
  return (
    <SelectField
      id="gender"
      name="gender"
      value={value}
      placeholder="Select gender"
      options={GENDER_OPTIONS}
      onChange={onChange}
    />
  );
}
