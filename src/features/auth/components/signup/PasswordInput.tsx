import { Eye, EyeOff } from "lucide-react";

import AuthField from "@/features/auth/components/shared/AuthField";
import { AUTH_EYE_BTN } from "@/features/auth/components/shared/authStyles";

interface PasswordInputProps {
  placeholder: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  showPassword: boolean;
  onToggle: () => void;
  disabled?: boolean;
  error?: string;
}

export default function PasswordInput({
  placeholder,
  value,
  onChange,
  showPassword,
  onToggle,
  disabled,
  error,
}: PasswordInputProps) {
  return (
    <AuthField
      type={showPassword ? "text" : "password"}
      label={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={error}
      autoComplete="new-password"
      data-pw=""
      trailing={
        <button
          type="button"
          onClick={onToggle}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          className={AUTH_EYE_BTN}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      }
    />
  );
}
