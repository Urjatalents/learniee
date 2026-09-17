"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import { emptyStep2FormData, type Step2FormData } from "@/features/parent/types/onboarding";
import {
  ACCEPTED_TYPES,
  MAX_FILE_SIZE_MB,
} from "@/features/parent/components/onboarding/step2/ChildPhotoUpload";

type Step2FormErrors = Partial<Record<keyof Step2FormData, string>>;

const MIN_AGE = 1;
const MAX_AGE = 25;

/** Every field here is shown to the user with a required "*" in step2/page.tsx — keep the two in sync. `learningDifficulties` and the photo are deliberately excluded, both are optional. */
function validateStep2(formData: Step2FormData): Step2FormErrors {
  const errors: Step2FormErrors = {};

  if (!formData.firstName.trim()) errors.firstName = "First name is required";
  if (!formData.lastName.trim()) errors.lastName = "Last name is required";
  if (!formData.visibleName.trim()) errors.visibleName = "Display name is required";
  if (!formData.gender) errors.gender = "Please select a gender";

  if (!formData.age.trim()) {
    errors.age = "Age is required";
  } else {
    const age = Number(formData.age);
    if (!Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) {
      errors.age = `Enter an age between ${MIN_AGE} and ${MAX_AGE}`;
    }
  }

  if (!formData.standard) errors.standard = "Please select a standard";
  if (!formData.board) errors.board = "Please select a board";
  if (!formData.currentSchoolName.trim()) errors.currentSchoolName = "School name is required";

  return errors;
}

export function useParentStep2Form() {
  const router = useRouter();

  const [formData, setFormData] = useState<Step2FormData>(emptyStep2FormData);
  const [errors, setErrors] = useState<Step2FormErrors>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name as keyof Step2FormData] ? { ...prev, [name]: undefined } : prev));
  }

  function handlePhotoSelect(file: File | null) {
    setPhotoError("");

    if (!file) {
      setPhoto(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError("Only PNG, JPG, or PDF files are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setPhotoError(`File must be under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setPhoto(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationErrors = validateStep2(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setError("Please fill in all required fields before continuing.");
      return;
    }

    setSubmitting(true);

    try {
      let photoKey: string | undefined;

      if (photo) {
        photoKey = await uploadFileToS3({ file: photo, folder: "child-photos" });
      }

      const res = await fetch("/api/onboarding/child-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, photoKey }),
      });

      if (!res.ok) {
        throw new Error("Something went wrong. Please try again.");
      }

      router.push("/parent/onboarding/step3");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return {
    formData,
    errors,
    photo,
    photoError,
    submitting,
    error,
    handleChange,
    handlePhotoSelect,
    handleSubmit,
  };
}
