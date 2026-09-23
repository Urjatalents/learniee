"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthenticationDetails, CognitoUser } from "amazon-cognito-identity-js";
import Cookies from "js-cookie";

import { userPool } from "@/lib/cognito";
import { logClientActivity } from "@/features/shared/utils/logClientActivity";

export function useLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Set when Cognito responds to authenticateUser() with a
  // NEW_PASSWORD_REQUIRED challenge — this happens on a user's first
  // login after an admin created their account via AdminCreateUser
  // (e.g. Staff Accounts / HR / Accounts / IT), which leaves them in
  // FORCE_CHANGE_PASSWORD status until they set a real password.
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [pendingCognitoUser, setPendingCognitoUser] = useState<CognitoUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  function routeForRole(role: unknown) {
    if (role === "hr") {
      router.push("/hr");
      return true;
    }
    if (role === "accounts") {
      router.push("/accounts");
      return true;
    }
    if (role === "it") {
      router.push("/it");
      return true;
    }
    return false;
  }

  function handleCompleteNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("Password must contain an uppercase letter, a lowercase letter, and a number.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!pendingCognitoUser) {
      setError("Session expired. Please log in again.");
      setForcePasswordChange(false);
      return;
    }

    setLoading(true);

    pendingCognitoUser.completeNewPasswordChallenge(
      newPassword,
      {},
      {
        onSuccess: async (session) => {
          try {
            const idToken = session.getIdToken().getJwtToken();
            Cookies.set("idToken", idToken, { expires: 1 });
            logClientActivity("LOGIN");

            const role = session.getIdToken().payload["custom:role"];
            setForcePasswordChange(false);
            setLoading(false);

            if (role === "admin") {
              router.push("/admin");
              return;
            }
            if (routeForRole(role)) return;

            // Parent/teacher accounts don't currently go through
            // AdminCreateUser, but handle it gracefully if that changes.
            router.push("/login");
          } catch (err) {
            console.error(err);
            setLoading(false);
            setError("Password changed, but something went wrong loading your account.");
          }
        },
        onFailure: (err) => {
          setLoading(false);
          setError(err.message);
        },
      },
    );
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);

    const user = new CognitoUser({
      Username: email.trim(),
      Pool: userPool,
    });

    const authDetails = new AuthenticationDetails({
      Username: email.trim(),
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: async (session) => {
        try {
          const idToken = session.getIdToken().getJwtToken();

          Cookies.set("idToken", idToken, {
            expires: 1,
          });
          logClientActivity("LOGIN");

          const role = session.getIdToken().payload["custom:role"];

          // -----------------------------
          // PARENT LOGIN
          // -----------------------------
          if (role === "parent") {
            const res = await fetch("/api/onboarding/status");

            if (!res.ok) {
              throw new Error("Unable to check parent onboarding status.");
            }

            const data = await res.json();

            if (!data.onboardingComplete) {
              router.push("/parent/onboarding/step1");
              return;
            }

            router.push("/parent");
            return;
          }

          // -----------------------------
          // TEACHER LOGIN
          // -----------------------------
          if (role === "teacher") {
            const res = await fetch("/api/teacher/onboarding/status");

            if (!res.ok) {
              throw new Error("Unable to check teacher onboarding status.");
            }

            const data = await res.json();

            // -----------------------------
            // ONBOARDING NOT COMPLETE
            // -----------------------------
            if (!data.onboardingComplete) {
              router.push("/teacher/onboarding/step1");
              return;
            }

            // -----------------------------
            // WAITING FOR ADMIN
            // -----------------------------
            if (data.approvalStatus === "PENDING") {
              router.push("/teacher/pending-approval");
              return;
            }

            // -----------------------------
            // ADMIN APPROVED
            // -----------------------------
            if (data.approvalStatus === "APPROVED") {
              // Bank Account Approval (Sep 10, 2026) — the very first
              // thing an approved Teacher needs to do is submit payout
              // bank details for Admin's separate approval, so they're
              // ready to be paid once cycles start completing. Only
              // gate on "never submitted" (MISSING) — once they've
              // submitted once, PENDING/APPROVED/REJECTED all mean
              // they've already engaged with the form, so don't force
              // a redirect there on every login; the sidebar link and
              // the page's own status banner cover the rest.
              if (data.bankAccountStatus === "MISSING") {
                router.push("/teacher/bank-account");
                return;
              }

              router.push("/teacher");
              return;
            }

            // -----------------------------
            // ADMIN REJECTED
            // -----------------------------
            // There is no /teacher/rejected page — the pending-approval
            // page shows the rejected state as well.
            if (data.approvalStatus === "REJECTED") {
              router.push("/teacher/pending-approval");
              return;
            }

            throw new Error("Invalid teacher approval status.");
          }

          if (role === "admin") {
            router.push("/admin");
            return;
          }

          if (routeForRole(role)) return;

          // -----------------------------
          // UNKNOWN ROLE
          // -----------------------------
          setError("Invalid user role. Please contact administrator.");

          setLoading(false);
        } catch (err) {
          console.error(err);

          setError(
            "Login successful, but something went wrong while loading your account.",
          );

          setLoading(false);
        }
      },

      onFailure: (err) => {
        setLoading(false);
        setError(err.message);
      },

      // Fired instead of onSuccess when the user was created via
      // AdminCreateUser (FORCE_CHANGE_PASSWORD status) and hasn't set
      // their own password yet.
      newPasswordRequired: () => {
        setLoading(false);
        setPendingCognitoUser(user);
        setForcePasswordChange(true);
      },
    });
  }

  return {
    email,
    password,
    error,
    loading,
    showPassword,

    forcePasswordChange,
    newPassword,
    confirmNewPassword,

    setShowPassword,
    setEmail,
    setPassword,
    setNewPassword,
    setConfirmNewPassword,

    handleLogin,
    handleCompleteNewPassword,
  };
}
