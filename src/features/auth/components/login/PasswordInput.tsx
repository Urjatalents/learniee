"use client";

import { Eye, EyeOff } from "lucide-react";

import AuthField from "@/features/auth/components/shared/AuthField";
import { AUTH_EYE_BTN } from "@/features/auth/components/shared/authStyles";

interface PasswordInputProps {
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  showPassword: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function PasswordInput({
  value,
  onChange,
  showPassword,
  onToggle,
  disabled = false,
}: PasswordInputProps) {
  return (
    <AuthField
      type={showPassword ? "text" : "password"}
      label="Password"
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoComplete="current-password"
      data-pw=""
      trailing={
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
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
