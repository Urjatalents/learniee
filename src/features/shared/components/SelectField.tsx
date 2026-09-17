interface SelectFieldProps {
  id?: string;
  name: string;
  value: string;
  placeholder: string;
  options: readonly string[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  "aria-invalid"?: boolean;
}

/** Plain <select> with a placeholder option, styled to match the app's Input component. */
export default function SelectField({
  id,
  name,
  value,
  placeholder,
  options,
  onChange,
  required,
  "aria-invalid": ariaInvalid,
}: SelectFieldProps) {
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

      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
