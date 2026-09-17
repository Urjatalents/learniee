"use client";

import { getData } from "country-list"

interface CountrySelectProps {
  id?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  required?: boolean;
  "aria-invalid"?: boolean;
}

export default function CountrySelect({
  id,
  name,
  value,
  onChange,
  placeholder = "Select country",
  required = false,
  "aria-invalid": ariaInvalid,
}: CountrySelectProps) {
  const countries = getData().sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      aria-invalid={ariaInvalid}
      className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm disabled:pointer-events-none disabled:opacity-50"
    >
      <option value="" disabled hidden>
        {placeholder}
      </option>

      {countries.map((country) => (
        <option key={country.code} value={country.name}>
          {country.name}
        </option>
      ))}
    </select>
  );
}