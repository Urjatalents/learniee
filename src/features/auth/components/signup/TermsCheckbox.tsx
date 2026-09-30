import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
}

const PRIMARY = "#7E2BF1";

export default function TermsCheckbox({
  checked,
  onChange,
  disabled,
  error,
}: TermsCheckboxProps) {
  return (
    <div>
      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          checked={checked}
          onCheckedChange={(value) =>
            onChange(value === true)
          }
          disabled={disabled}
        />

        <span className="text-sm text-gray-600">
          I accept the{" "}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: PRIMARY }}
            className="font-medium"
          >
            Terms & Conditions
          </Link>,{" "}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: PRIMARY }}
            className="font-medium"
          >
            Privacy Policy
          </Link> and{" "}
          <Link
            href="/refunds"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: PRIMARY }}
            className="font-medium"
          >
            Refund Policy
          </Link>
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-600 ml-1">
          {error}
        </p>
      )}
    </div>
  );
}