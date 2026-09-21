"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { emptyStep1FormData, type Step1FormData } from "@/features/teacher/types/step1";
import { uploadTeacherFile } from "@/features/teacher/utils/uploadTeacherFile";
import { useTeacherStep1Files } from "@/features/teacher/hooks/useTeacherStep1Files";

async function postStep1(body: unknown) {
  const res = await fetch("/api/teacher/onboarding/step1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to save Step 1.");
  }

  return res.json();
}

export function useTeacherStep1Form() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<Step1FormData>(emptyStep1FormData);
  const [, setTeacherId] = useState<string | null>(null);

  const files = useTeacherStep1Files();

  useEffect(() => {
    async function loadTeacherData() {
      try {
        setLoading(true);

        const res = await fetch("/api/teacher/onboarding/step1", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load teacher information");
        }

        const data = await res.json();
        setFormData(data.formData);

        if (data.teacherId) {
          setTeacherId(data.teacherId);
          localStorage.setItem("teacherId", data.teacherId);
        }

        files.loadExisting(data.files);
      } catch (error) {
        console.error("Failed to load Step 1:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTeacherData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (files.fileErrors.profilePhoto || files.fileErrors.introVideo) {
      return;
    }

    // A video introduction is now mandatory — not optional. Block
    // advancing to Step 2 if there's neither a newly selected video
    // nor one already on file from a previous session. See
    // useTeacherStep1Files.ts's markIntroVideoRequired().
    if (!files.introVideo && !files.existingIntroVideo) {
      files.markIntroVideoRequired();
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // 1. Save personal information first — creates the Teacher record if necessary.
      const teacherData = await postStep1(formData);
      const currentTeacherId = teacherData.teacherId;

      setTeacherId(currentTeacherId);
      localStorage.setItem("teacherId", currentTeacherId);

      // 2. Upload any selected files to S3.
      const profilePhotoData = files.profilePhoto
        ? await uploadTeacherFile(files.profilePhoto, currentTeacherId)
        : undefined;
      const introVideoData = files.introVideo
        ? await uploadTeacherFile(files.introVideo, currentTeacherId)
        : undefined;

      // 3. If anything was uploaded, save the S3 metadata as TeacherFile records.
      if (profilePhotoData || introVideoData) {
        await postStep1({
          ...formData,
          profilePhoto: profilePhotoData,
          introVideo: introVideoData,
        });
      }

      router.push("/teacher/onboarding/step2");
    } catch (error) {
      console.error("Step 1 submission error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return {
    loading,
    submitting,
    error,
    formData,
    handleChange,
    handleSubmit,

    profilePhoto: files.profilePhoto,
    introVideo: files.introVideo,
    existingProfilePhoto: files.existingProfilePhoto,
    existingIntroVideo: files.existingIntroVideo,
    handleProfilePhotoChange: files.handleProfilePhotoChange,
    handleIntroVideoChange: files.handleIntroVideoChange,
    fileErrors: files.fileErrors,
  };
}
