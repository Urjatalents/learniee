"use client";

import Link from "next/link";

import { useEffect } from "react";

import LoginInput from "./LoginInput";
import PasswordInput from "./PasswordInput";
import { useAuthStage } from "@/features/auth/components/shared/AuthShell";
import {
  AUTH_BTN_MAIN,
  AUTH_ERROR,
  AUTH_LINK,
} from "@/features/auth/components/shared/authStyles";
import AuthField from "@/features/auth/components/shared/AuthField";
import { useLogin } from "@/features/auth/hooks/useLogin";

export default function LoginForm() {
  const {
    email,
    password,
    error,
    loading,

    showPassword,

    forcePasswordChange,
    newPassword,
    confirmNewPassword,

    setEmail,
    setPassword,
    setShowPassword,
    setNewPassword,
    setConfirmNewPassword,

    handleLogin,
    handleCompleteNewPassword,
  } = useLogin();

  // Purely visual: make the characters react when an error appears.
  const { signalError } = useAuthStage();
  useEffect(() => {
    if (error) signalError();
  }, [error, signalError]);

  if (forcePasswordChange) {
    return (
      <div className="flex flex-1 flex-col">
        <h1 className="mt-3.5 text-center font-heading text-[1.9rem] font-bold text-[#1b1530]">
          Set a New Password
        </h1>
        <p className="mb-4 mt-0.5 text-center text-sm text-[#6f6a82]">
          This is your first login. Choose a new password to continue.
        </p>

        <form onSubmit={handleCompleteNewPassword} className="flex flex-col gap-3.5" noValidate>
          <AuthField
            type="password"
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            data-pw=""
          />
          <AuthField
            type="password"
            label="Confirm New Password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            data-pw=""
          />

          <p className="text-xs text-[#6f6a82]">
            Password must contain at least 8 characters, one uppercase letter, one lowercase
            letter, and one number.
          </p>

          <p className={AUTH_ERROR} role="alert">
            {error}
          </p>

          <button type="submit" disabled={loading} className={AUTH_BTN_MAIN}>
            {loading ? "Updating..." : "Set Password & Continue"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Heading */}
      <h1 className="mt-3.5 text-center font-heading text-[1.9rem] font-bold text-[#1b1530]">
        Welcome back!
      </h1>
      <p className="mb-[18px] mt-0.5 text-center text-[0.9rem] text-[#6f6a82]">
        Please enter your details
      </p>

      <form onSubmit={handleLogin} className="flex flex-col gap-3.5" noValidate>
        {/* Email */}
        <LoginInput
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="email"
        />

        {/* Password */}
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showPassword={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
          disabled={loading}
        />

        {/* Forgot Password */}
        <div className="flex justify-end text-[0.8rem]">
          <Link href="/forgot-password" className={AUTH_LINK}>
            Forgot password?
          </Link>
        </div>

        {/* Error */}
        <p className={AUTH_ERROR} role="alert">
          {error}
        </p>

        {/* Login button */}
        <button type="submit" disabled={loading} className={AUTH_BTN_MAIN}>
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <p className="mt-auto pt-4 text-center text-[0.85rem] text-[#6f6a82]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className={AUTH_LINK}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
