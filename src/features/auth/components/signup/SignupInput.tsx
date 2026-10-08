import AuthField from "@/features/auth/components/shared/AuthField";

interface SignupInputProps {
  placeholder: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  type?: string;
  disabled?: boolean;
  error?: string;
  autoComplete?: string;
}

export default function SignupInput({
  placeholder,
  value,
  onChange,
  type = "text",
  disabled = false,
  error,
  autoComplete,
}: SignupInputProps) {
  return (
    <AuthField
      type={type}
      label={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={error}
      autoComplete={autoComplete}
    />
  );
}
