"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { emptyStep3FormData, type Step3FormData } from "@/features/parent/types/onboarding";

type Step3FormErrors = Partial<Record<keyof Step3FormData, string>>;

/** Every field here is shown to the user with a required "*" in step3/page.tsx — keep the two in sync. The "About the child" and "Anything else" fields are all deliberately excluded, they're optional. */
function validateStep3(formData: Step3FormData): Step3FormErrors {
  const errors: Step3FormErrors = {};

  if (!formData.childStatus.trim()) errors.childStatus = "This field is required";
  if (!formData.onlineTuition) errors.onlineTuition = "Please select a preference";
  if (!formData.modeOfCommunication) errors.modeOfCommunication = "Please select a mode";
  if (!formData.preferredLanguage) errors.preferredLanguage = "Please select a language";

  return errors;
}

export function useParentStep3Form() {
  const router = useRouter();

  const [formData, setFormData] = useState<Step3FormData>(emptyStep3FormData);
  const [errors, setErrors] = useState<Step3FormErrors>({});
  const [suggestions, setSuggestions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name as keyof Step3FormData] ? { ...prev, [name]: undefined } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationErrors = validateStep3(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setError("Please fill in all required fields before finishing.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/onboarding/additional-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, suggestions }),
      });

      if (!res.ok) {
        throw new Error("Something went wrong. Please try again.");
      }

      router.push("/parent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return {
    formData,
    errors,
    suggestions,
    setSuggestions,
    submitting,
    error,
    handleChange,
    handleSubmit,
  };
}
