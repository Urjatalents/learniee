"use client";

import AuthField from "@/features/auth/components/shared/AuthField";

interface LoginInputProps {
  type?: "text" | "email";
  placeholder: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  disabled?: boolean;
  autoComplete?: string;
}

export default function LoginInput({
  type = "text",
  placeholder,
  value,
  onChange,
  disabled = false,
  autoComplete,
}: LoginInputProps) {
  return (
    <AuthField
      type={type}
      label={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoComplete={autoComplete}
    />
  );
}
