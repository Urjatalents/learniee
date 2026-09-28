import Link from "next/link";
import BrandLogo from "@/features/shared/components/BrandLogo";
import SignupForm from "@/features/auth/components/signup/SignupForm";
import SignupSidePanel from "@/features/auth/components/signup/SignupSidePanel";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6">
      <Link href="/" aria-label="Learniee home">
        <BrandLogo className="h-12 w-auto" priority />
      </Link>
      <div className="flex flex-col md:flex-row w-full max-w-4xl">
        <SignupSidePanel />
        <SignupForm />
      </div>
    </div>
  );
}