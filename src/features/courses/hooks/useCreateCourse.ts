"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import { SUBJECT_OPTIONS } from "@/features/courses/constants/courseOptions";
import { formatSchedule } from "@/features/shared/utils/weekdays";
import { frequencyForDays, timeSlotForTime } from "@/features/shared/utils/classRequestStatus";
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
  // True when the vacancy fixes the price/grade (course form then locks them).
  const [pricingLocked, setPricingLocked] = useState(false);
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
        const days: number[] = Array.isArray(v.preferredDays) ? v.preferredDays : [];
        const scheduleText = days.length
          ? formatSchedule(days, v.preferredTime)
          : v.preferredSchedule ?? "";
        const details = [
          v.description,
          scheduleText ? `Preferred schedule (IST): ${scheduleText}` : "",
        ].filter(Boolean);

        setClassRequestId(requestId);
        setInitialValues({
          courseTitle: v.title,
          // The form's Subject/Grade/Board are fixed lists, so a custom
          // subject is carried in the title/tags instead of a blank select.
          // A custom subject goes in via "Other" + the written name.
          ...((SUBJECT_OPTIONS as readonly string[]).includes(v.subject)
            ? { subject: v.subject }
            : { subject: "Other", subjectOther: v.subject ?? "" }),
          gradeMode: "single",
          gradeFrom: v.grade ?? "",
          grade: v.grade ?? "",
          board: v.board ?? "",
          language: v.language ?? "",
          courseTags: v.subject ?? "",
          description: details.join("\n\n"),
          // From the parent's requested days/time.
          frequency: frequencyForDays(days.length) ?? "",
          timeSlot: timeSlotForTime(v.preferredTime) ?? "",
          // A request is for one child.
          type: "Individual",
          // Fixed by grade for vacancy listings; the server enforces it too.
          ...(typeof v.pricePerSession === "number" ? { price: String(v.pricePerSession) } : {}),
        });
        setPricingLocked(typeof v.pricePerSession === "number");
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
    pricingLocked,
  };
}
