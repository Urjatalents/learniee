import { SignupRole } from "@/features/auth/types/signup";

interface RoleSelectorProps {
  role: SignupRole;
  onChange: (role: SignupRole) => void;
  disabled?: boolean;
}

const OPTIONS: { value: SignupRole; label: string }[] = [
  { value: "parent", label: "Parent" },
  { value: "teacher", label: "Teacher" },
];

export default function RoleSelector({
  role,
  onChange,
  disabled,
}: RoleSelectorProps) {
  return (
    <div
      role="group"
      aria-label="I am a"
      className="grid grid-cols-2 rounded-full bg-[#f3f0fa] p-1"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          aria-pressed={role === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-full py-2 text-[0.9rem] font-bold transition-colors focus-visible:outline-3 focus-visible:outline-[#f4c01e] disabled:opacity-60 ${
            role === option.value
              ? "bg-[#7e2bf1] text-white"
              : "text-[#6f6a82]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
