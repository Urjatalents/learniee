import { Checkbox } from "@/components/ui/checkbox";

interface TeacherConfirmationCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
}

export default function TeacherConfirmationCheckbox({
  checked,
  onChange,
  disabled,
  error,
}: TeacherConfirmationCheckboxProps) {
  return (
    <div>
      <div className="flex items-start gap-2 pt-1">
        <Checkbox
          checked={checked}
          onCheckedChange={(value) =>
            onChange(value === true)
          }
          disabled={disabled}
          className="mt-0.5"
        />

        <span className="text-[0.8rem] text-[#6f6a82]">
          I confirm that I am signing up as a{" "}
          <span className="font-semibold">Teacher</span>, and I
          understand this account type cannot easily be changed
          later.
        </span>
      </div>

      {error && (
        <p className="ml-1 text-xs text-[#e5484d]">
          {error}
        </p>
      )}
    </div>
  );
}
