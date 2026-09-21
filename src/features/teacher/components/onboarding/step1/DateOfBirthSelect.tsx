"use client";

import SelectField from "@/features/shared/components/SelectField";

interface DateOfBirthSelectProps {
  day: string;
  month: string;
  year: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function DateOfBirthSelect({
  day,
  month,
  year,
  onChange,
}: DateOfBirthSelectProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

  return (
    <div className="grid grid-cols-3 gap-2">
      <SelectField
        id="dobDay"
        name="dobDay"
        value={day}
        placeholder="Date"
        options={DAYS}
        onChange={onChange}
      />

      <SelectField
        id="dobMonth"
        name="dobMonth"
        value={month}
        placeholder="Month"
        options={MONTHS}
        onChange={onChange}
      />

      <SelectField
        id="dobYear"
        name="dobYear"
        value={year}
        placeholder="Year"
        options={years}
        onChange={onChange}
      />
    </div>
  );
}
