"use client";

import { useEffect, useRef, useState } from "react";
import CourseConfigFields from "@/features/courses/components/CourseConfigFields";
import CourseDetailFields from "@/features/courses/components/CourseDetailFields";
import CourseCertificateFields from "@/features/courses/components/CourseCertificateFields";
import { formatGradeRange, getStandardSessionPrice } from "@/features/courses/utils/coursePricing";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import { initialCourseFormData, type CourseFormData } from "@/features/courses/types/course";

interface Props {
  onChange: (data: CourseFormData) => void;
  /** Prefill applied once when it first arrives (e.g. from an accepted class-request vacancy). */
  initialValues?: Partial<CourseFormData>;
  /**
   * True when listing for a class-request vacancy: grade and price are fixed by
   * the request's grade (the server enforces this too), so both are read-only.
   */
  pricingLocked?: boolean;
}

/**
 * Sets Price to the standard per-session rate for the given
 * grade/IITian combination and lecture duration (hourly rate scaled by
 * length). No-op (keeps whatever Price already holds) when neither the
 * grade nor the IITian flag resolves to a standard rate.
 */
function withStandardPrice(data: CourseFormData): CourseFormData {
  const standard = getStandardSessionPrice(
    data.grade || null,
    data.isIITian,
    sessionLengthForCourse(data.duration),
  );
  return standard != null ? { ...data, price: String(standard) } : data;
}

/** Derives the single stored `grade` ("Grade 8" / "Grade 6-8") from the grade controls. */
function withDerivedGrade(data: CourseFormData): CourseFormData {
  const from = Number(data.gradeFrom.replace(/\D/g, ""));
  const to = Number(data.gradeTo.replace(/\D/g, ""));

  if (!from) return { ...data, grade: "" };

  if (data.gradeMode === "single") return { ...data, grade: data.gradeFrom };

  return { ...data, grade: to ? formatGradeRange(from, to) ?? "" : "" };
}

export default function CreateCourseForm({ onChange, initialValues, pricingLocked = false }: Props) {
  const [formData, setFormData] = useState<CourseFormData>(initialCourseFormData);
  // Tracks whether the teacher has deliberately typed their own price,
  // so we stop auto-prefilling once they have (and never for IITian,
  // whose price is always fixed).
  const [priceTouched, setPriceTouched] = useState(false);
  // Latest form state for the async effects below, so they can compute the
  // next value outside a setState updater and call onChange (a parent
  // setState) from the effect itself, never from inside an updater.
  const latestForm = useRef<CourseFormData>(formData);

  // A vacancy listing is never an IITian listing — its price is fixed by grade.
  const lockedRef = useRef(pricingLocked);

  useEffect(() => {
    lockedRef.current = pricingLocked;
  }, [pricingLocked]);

  function applyForm(input: CourseFormData) {
    const base = lockedRef.current ? { ...input, isIITian: false } : input;
    const next = withDerivedGrade(base);
    latestForm.current = next;
    setFormData(next);
    onChange(next);
  }
  // Whether the logged-in teacher is eligible for an IITian listing:
  // self-declared IITian at onboarding Step 1 AND Admin-approved
  // ("verified"). Only then is the course forced to the IITian
  // listing/price — a teacher who never declared IITian, or isn't
  // verified yet, is never even shown the option. This is a UX
  // convenience only: the create-course API route re-derives the same
  // flag from the teacher's own DB record and is authoritative
  // regardless of what this component sends.
  const [teacherIITianEligible, setTeacherIITianEligible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function applyIITianStatusFromProfile() {
      try {
        const res = await fetch("/api/teacher/profile");
        if (!res.ok) return;

        const data = await res.json();
        const eligible =
          Boolean(data.teacher?.isIITian) && data.teacher?.approvalStatus === "APPROVED";

        if (cancelled || !eligible) return;

        setTeacherIITianEligible(true);
        applyForm(withStandardPrice({ ...latestForm.current, isIITian: true }));
      } catch {
        // Non-fatal — worst case the teacher doesn't see the IITian
        // lock; the price/flag are still enforced server-side on submit.
      }
    }

    applyIITianStatusFromProfile();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time prefill. Price follows the standard rate for the prefilled
  // grade unless the teacher later types their own (priceTouched).
  useEffect(() => {
    if (!initialValues) return;

    applyForm(withStandardPrice(withDerivedGrade({ ...latestForm.current, ...initialValues })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;

    // Grade and price are fixed for vacancy listings.
    if (pricingLocked && (name === "gradeFrom" || name === "gradeTo" || name === "price")) return;

    let updatedData = withDerivedGrade({ ...formData, [name]: value });

    if (name === "price") {
      // Manual edit — stop auto-prefilling for the rest of this form.
      setPriceTouched(true);
    } else if (
      (name === "gradeFrom" || name === "gradeTo" || name === "duration") &&
      // IITian / vacancy prices always follow the rate; otherwise only until
      // the teacher has typed their own.
      (formData.isIITian || pricingLocked || !priceTouched)
    ) {
      // Grade or lecture length changed — keep Price at the standard rate.
      updatedData = withStandardPrice(updatedData);
    }

    applyForm(updatedData);
  }

  function handleGradeModeChange(mode: "single" | "range") {
    if (pricingLocked) return;

    // Switching to a single grade drops the upper end of the range.
    let next: CourseFormData = { ...formData, gradeMode: mode, gradeTo: mode === "single" ? "" : formData.gradeTo };
    next = withDerivedGrade(next);

    applyForm(!priceTouched && !formData.isIITian ? withStandardPrice(next) : next);
  }

  function handleCertificateToggle(checked: boolean) {
    applyForm({ ...formData, certificateEnabled: checked });
  }

  return (
    <div className="space-y-6">
      <CourseConfigFields formData={formData} onChange={handleChange} gradeLocked={pricingLocked}
        onGradeModeChange={handleGradeModeChange}
      />
      <CourseDetailFields
        formData={formData}
        onChange={handleChange}
        iitianEligible={teacherIITianEligible && !pricingLocked}
        priceLocked={pricingLocked}
      />
      <CourseCertificateFields
        formData={formData}
        onChange={handleChange}
        onToggle={handleCertificateToggle}
      />
    </div>
  );
}
