"use client";

interface CheckboxFieldProps {
  name: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Native checkbox (keeps the existing `e.target.checked` handler working) styled to the violet theme. */
export default function CheckboxField({
  name,
  label,
  checked,
  onChange,
}: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-4 rounded border-gray-300 accent-violet-600"
      />
      <span>{label}</span>
    </label>
  );
}
