import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
}

export default function TermsCheckbox({
  checked,
  onChange,
  disabled,
  error,
}: TermsCheckboxProps) {
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
          I accept the{" "}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#7e2bf1] hover:underline"
          >
            Terms & Conditions
          </Link>,{" "}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#7e2bf1] hover:underline"
          >
            Privacy Policy
          </Link> and{" "}
          <Link
            href="/refunds"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#7e2bf1] hover:underline"
          >
            Refund Policy
          </Link>
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