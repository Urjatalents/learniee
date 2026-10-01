"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import { SUBJECT_OPTIONS } from "@/features/courses/constants/courseOptions";
import { initialCourseFormData, type CourseFormData } from "@/features/courses/types/course";

export function useCreateCourse() {
  const router = useRouter();

  const [formData, setFormData] = useState<CourseFormData>(initialCourseFormData);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Set when arriving from an accepted vacancy (/teacher/vacancy):
  // `?classRequestId=…` links the new course to it and prefills the form.
  const [classRequestId, setClassRequestId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<Partial<CourseFormData> | undefined>();

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("classRequestId");

    if (!id) return;

    let cancelled = false;

    async function loadVacancy(requestId: string) {
      try {
        const res = await fetch(`/api/teacher/class-requests/${encodeURIComponent(requestId)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load the vacancy.");
        }

        if (cancelled) return;

        const v = data.vacancy;
        const details = [
          v.description,
          v.preferredSchedule ? `Preferred schedule: ${v.preferredSchedule}` : "",
        ].filter(Boolean);

        setClassRequestId(requestId);
        setInitialValues({
          courseTitle: v.title,
          // The form's Subject/Grade/Board are fixed lists, so a custom
          // subject is carried in the title/tags instead of a blank select.
          subject: SUBJECT_OPTIONS.includes(v.subject) ? v.subject : "",
          grade: v.grade ?? "",
          board: v.board ?? "",
          language: v.language ?? "",
          courseTags: v.subject ?? "",
          description: details.join("\n\n"),
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load the vacancy.");
        }
      }
    }

    loadVacancy(id);

    return () => {
      cancelled = true;
    };
  }, []);

  function goToCourseManagement() {
    router.push("/teacher/course-management");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!formData.courseTitle.trim()) {
      setError("Course title is required.");
      return;
    }

    if (!thumbnail) {
      setError("Course thumbnail is required.");
      return;
    }

    if (!introVideo) {
      setError("Course intro video is required.");
      return;
    }

    try {
      setSaving(true);

      // 1. Upload thumbnail to S3.
      const thumbnailKey = await uploadFileToS3({ file: thumbnail, folder: "course-media" });

      // 2. Upload intro video to S3.
      const introVideoKey = await uploadFileToS3({ file: introVideo, folder: "course-media" });

      // 3. Save course data + S3 keys.
      const res = await fetch("/api/teacher/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          thumbnailKey,
          introVideoKey,
          ...(classRequestId ? { classRequestId } : {}),
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to create course.");
      }

      // 4. Success.
      goToCourseManagement();
    } catch (err) {
      console.error("Create course error:", err);
      setError(err instanceof Error ? err.message : "Failed to create course.");
    } finally {
      setSaving(false);
    }
  }

  return {
    formData,
    setFormData,
    thumbnail,
    setThumbnail,
    introVideo,
    setIntroVideo,
    saving,
    error,
    handleSubmit,
    goToCourseManagement,
    initialValues,
    classRequestId,
  };
}
