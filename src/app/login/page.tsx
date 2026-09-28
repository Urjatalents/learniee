import Link from "next/link";
import BrandLogo from "@/features/shared/components/BrandLogo";
import LoginForm from "@/features/auth/components/login/LoginForm";
import LoginSidePanel from "@/features/auth/components/login/LoginSidePanel";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white px-4 py-8">
      <Link href="/" aria-label="Learniee home">
        <BrandLogo className="h-12 w-auto" priority />
      </Link>
      <div className="flex w-full max-w-[940px] items-center">
        
        {/* Login form on LEFT */}
        <LoginForm />

        {/* Purple panel on RIGHT */}
        <LoginSidePanel />

      </div>
    </main>
  );
}