"use client";

import { useEffect } from "react";
import Link from "next/link";

import SignupInput from "./SignupInput";
import PasswordInput from "./PasswordInput";
import TermsCheckbox from "./TermsCheckbox";
import TeacherConfirmationCheckbox from "./TeacherConfirmationCheckbox";
import OtpVerification from "./OtpVerification";
import RoleSelector from "./RoleSelector";
import { useSignup } from "@/features/auth/hooks/useSignup";
import PhoneInput from "@/features/auth/components/signup/PhoneInput";
import { useAuthStage } from "@/features/auth/components/shared/AuthShell";
import {
  AUTH_BTN_MAIN,
  AUTH_ERROR,
  AUTH_LINK,
} from "@/features/auth/components/shared/authStyles";

export default function SignupForm() {
  const {
    form,
    errors,
    submitError,
    otpError,

    showPassword,
    showConfirmPassword,

    otpSent,
    sendingOtp,
    verifying,
    verified,

    updateField,
    handleSendOtp,
    handleResendOtp,
    handleVerifyOtp,
    handleContinueToLogin,

    setShowPassword,
    setShowConfirmPassword,
  } = useSignup();

  // Purely visual: characters react to errors and to a verified email.
  const { signalError, signalSuccess } = useAuthStage();
  const hasFieldError = Object.values(errors).some(Boolean);
  useEffect(() => {
    if (submitError || otpError || hasFieldError) signalError();
  }, [submitError, otpError, hasFieldError, signalError]);
  useEffect(() => {
    if (verified) signalSuccess();
  }, [verified, signalSuccess]);

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mt-3.5 text-center font-heading text-[1.9rem] font-bold text-[#1b1530]">
        {form.role === "parent" ? "Parent Sign up" : "Teacher Sign up"}
      </h1>
      <p className="mb-[18px] mt-0.5 text-center text-[0.9rem] text-[#6f6a82]">
        Create your account in a minute
      </p>

      <form
        onSubmit={handleContinueToLogin}
        className="flex flex-col gap-3.5"
        noValidate
      >
        <RoleSelector
          role={form.role}
          onChange={(role) => updateField("role", role)}
          disabled={otpSent}
        />

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <SignupInput
            placeholder="First name"
            value={form.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            disabled={otpSent}
            error={errors.firstName}
            autoComplete="given-name"
          />

          <SignupInput
            placeholder="Last name"
            value={form.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            disabled={otpSent}
            error={errors.lastName}
            autoComplete="family-name"
          />
        </div>

        <SignupInput
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          disabled={otpSent}
          error={errors.email}
          autoComplete="email"
        />

        <div className="auth-underline" data-invalid={errors.phone ? "true" : undefined}>
          <PhoneInput
            value={form.phone}
            onChange={(value) => updateField("phone", value)}
            error={errors.phone}
          />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <PasswordInput
            placeholder="Password"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            showPassword={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            disabled={otpSent}
            error={errors.password}
          />

          <PasswordInput
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={(e) => updateField("confirmPassword", e.target.value)}
            showPassword={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((value) => !value)}
            disabled={otpSent}
            error={errors.confirmPassword}
          />
        </div>

        {form.role === "teacher" && (
          <TeacherConfirmationCheckbox
            checked={form.confirmedTeacherRole}
            onChange={(value) => updateField("confirmedTeacherRole", value)}
            disabled={otpSent}
            error={errors.confirmedTeacherRole}
          />
        )}

        <TermsCheckbox
          checked={form.acceptedTerms}
          onChange={(value) => updateField("acceptedTerms", value)}
          disabled={otpSent}
          error={errors.acceptedTerms}
        />

        <p className={AUTH_ERROR} role="alert">
          {submitError}
        </p>

        {!otpSent && (
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={sendingOtp}
            className={AUTH_BTN_MAIN}
          >
            {sendingOtp ? "Sending..." : "Send OTP"}
          </button>
        )}

        {otpSent && (
          <OtpVerification
            email={form.email}
            otp={form.otp}
            otpError={otpError}
            verifying={verifying}
            sendingOtp={sendingOtp}
            verified={verified}
            onOtpChange={(e) => updateField("otp", e.target.value)}
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
          />
        )}

        {verified && (
          <button type="submit" className={AUTH_BTN_MAIN}>
            Continue to Login
          </button>
        )}
      </form>

      <p className="mt-auto pt-4 text-center text-[0.85rem] text-[#6f6a82]">
        Already have an account?{" "}
        <Link href="/login" className={AUTH_LINK}>
          Log in
        </Link>
      </p>
    </div>
  );
}
