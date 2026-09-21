"use client";

export interface LabeledOption {
  value: string;
  label: string;
}

interface LabeledSelectProps {
  id?: string;
  name: string;
  value: string;
  placeholder: string;
  options: readonly LabeledOption[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * Same styling as the shared `SelectField`, but for options whose stored
 * value differs from the text shown (e.g. value "1-3" shown as "1-3 years").
 * `SelectField` uses one string for both, so it can't be used for those.
 */
export default function LabeledSelect({
  id,
  name,
  value,
  placeholder,
  options,
  onChange,
}: LabeledSelectProps) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm disabled:pointer-events-none disabled:opacity-50"
    >
      <option value="" disabled hidden>
        {placeholder}
      </option>

      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
