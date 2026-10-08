import SignupForm from "@/features/auth/components/signup/SignupForm";
import AuthShell from "@/features/auth/components/shared/AuthShell";

export default function SignupPage() {
  return (
    <AuthShell>
      <SignupForm />
    </AuthShell>
  );
}
