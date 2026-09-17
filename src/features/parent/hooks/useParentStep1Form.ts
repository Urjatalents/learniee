"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidPhoneNumber } from "react-phone-number-input";
import { emptyStep1FormData, type Step1FormData } from "@/features/parent/types/onboarding";

type Step1FormErrors = Partial<Record<keyof Step1FormData, string>>;

async function postStep1(body: Step1FormData) {
  const res = await fetch("/api/onboarding/parent-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("Something went wrong. Please try again.");
  }
}

/** Every field here is shown to the user with a required "*" in step1/page.tsx — keep the two in sync. `referredByCode` is deliberately excluded, it's optional. */
function validateStep1(formData: Step1FormData): Step1FormErrors {
  const errors: Step1FormErrors = {};

  if (!formData.visibleName.trim()) errors.visibleName = "Display name is required";
  if (!formData.nationality.trim()) errors.nationality = "Nationality is required";
  if (!formData.nriOrIndian) errors.nriOrIndian = "Please select one";
  if (!formData.relationToStudent) errors.relationToStudent = "Please select a relation";
  if (!formData.tuitionType) errors.tuitionType = "Please select a tuition type";

  if (!formData.address.trim()) errors.address = "Address is required";
  if (!formData.city.trim()) errors.city = "City is required";
  if (!formData.pincode.trim()) errors.pincode = "Pincode is required";
  if (!formData.country) errors.country = "Please select a country";
  if (!formData.timezone) errors.timezone = "Please select a timezone";

  if (!formData.whatsappNumber.trim()) {
    errors.whatsappNumber = "WhatsApp number is required";
  } else if (!isValidPhoneNumber(formData.whatsappNumber)) {
    errors.whatsappNumber = "Enter a valid phone number";
  }

  if (!formData.currency) errors.currency = "Please select a currency";

  return errors;
}

export function useParentStep1Form() {
  const router = useRouter();

  const [formData, setFormData] = useState<Step1FormData>(emptyStep1FormData);
  const [errors, setErrors] = useState<Step1FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name as keyof Step1FormData] ? { ...prev, [name]: undefined } : prev));
  }

  function handleWhatsappChange(value: string) {
    setFormData((prev) => ({ ...prev, whatsappNumber: value }));
    setErrors((prev) => (prev.whatsappNumber ? { ...prev, whatsappNumber: undefined } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationErrors = validateStep1(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setError("Please fill in all required fields before continuing.");
      return;
    }

    setSubmitting(true);

    try {
      await postStep1(formData);
      router.push("/parent/onboarding/step2");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return { formData, errors, submitting, error, handleChange, handleWhatsappChange, handleSubmit };
}
