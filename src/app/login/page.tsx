import LoginForm from "@/features/auth/components/login/LoginForm";
import AuthShell from "@/features/auth/components/shared/AuthShell";

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
