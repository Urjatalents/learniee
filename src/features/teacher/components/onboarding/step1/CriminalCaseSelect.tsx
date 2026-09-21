"use client";

import SelectField from "@/features/shared/components/SelectField";

interface CriminalCaseSelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const CRIMINAL_CASE_OPTIONS = ["No", "Yes"];

export default function CriminalCaseSelect({
  value,
  onChange,
}: CriminalCaseSelectProps) {
  return (
    <SelectField
      id="criminalCase"
      name="criminalCase"
      value={value}
      placeholder="Select one"
      options={CRIMINAL_CASE_OPTIONS}
      onChange={onChange}
    />
  );
}
