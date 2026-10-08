import AuthField from "@/features/auth/components/shared/AuthField";
import {
  AUTH_BTN_MAIN,
  AUTH_LINK,
} from "@/features/auth/components/shared/authStyles";

interface OtpVerificationProps {
  email: string;
  otp: string;
  otpError: string;
  verifying: boolean;
  sendingOtp: boolean;
  verified: boolean;
  onOtpChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onVerify: () => void;
  onResend: () => void;
}

export default function OtpVerification({
  email,
  otp,
  otpError,
  verifying,
  sendingOtp,
  verified,
  onOtpChange,
  onVerify,
  onResend,
}: OtpVerificationProps) {
  if (verified) {
    return (
      <div className="space-y-2 pt-1">
        <p className="text-center text-sm font-bold text-[#1f8f55]">
          Email verified successfully.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      <p className="text-xs text-[#6f6a82]">
        We emailed a verification code to {email}
      </p>

      <AuthField
        label="Enter OTP"
        value={otp}
        onChange={onOtpChange}
        error={otpError}
        inputMode="numeric"
        autoComplete="one-time-code"
      />

      <button
        type="button"
        onClick={onVerify}
        disabled={verifying}
        className={AUTH_BTN_MAIN}
      >
        {verifying ? "Verifying..." : "Verify OTP"}
      </button>

      <button
        type="button"
        onClick={onResend}
        disabled={sendingOtp}
        className={`${AUTH_LINK} w-full text-xs disabled:opacity-50`}
      >
        {sendingOtp ? "Resending..." : "Resend OTP"}
      </button>
    </div>
  );
}
