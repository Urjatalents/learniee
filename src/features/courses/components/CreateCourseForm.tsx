"use client";

import { useState } from "react";
import CourseConfigFields from "@/features/courses/components/CourseConfigFields";
import CourseDetailFields from "@/features/courses/components/CourseDetailFields";
import CourseCertificateFields from "@/features/courses/components/CourseCertificateFields";
import { getStandardPrice } from "@/features/courses/utils/coursePricing";
import { initialCourseFormData, type CourseFormData } from "@/features/courses/types/course";

interface Props {
  onChange: (data: CourseFormData) => void;
}

/**
 * Sets Price to the standard rate for the given grade/IITian
 * combination. No-op (keeps whatever Price already holds) when
 * neither the grade nor the IITian flag resolves to a standard rate.
 */
function withStandardPrice(data: CourseFormData): CourseFormData {
  const standard = getStandardPrice(data.grade || null, data.isIITian);
  return standard != null ? { ...data, price: String(standard) } : data;
}

export default function CreateCourseForm({ onChange }: Props) {
  const [formData, setFormData] = useState<CourseFormData>(initialCourseFormData);
  // Tracks whether the teacher has deliberately typed their own price,
  // so we stop auto-prefilling once they have (and never for IITian,
  // whose price is always fixed).
  const [priceTouched, setPriceTouched] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    let updatedData = { ...formData, [name]: value };

    if (name === "price") {
      // Manual edit — stop auto-prefilling for the rest of this form.
      setPriceTouched(true);
    } else if (name === "grade" && !priceTouched && !formData.isIITian) {
      // Grade just changed and the teacher hasn't touched Price yet —
      // keep it prefilled with the new standard rate.
      updatedData = withStandardPrice(updatedData);
    }

    setFormData(updatedData);
    onChange(updatedData);
  }

  function handleCertificateToggle(checked: boolean) {
    const updatedData = { ...formData, certificateEnabled: checked };

    setFormData(updatedData);
    onChange(updatedData);
  }

  function handleIITianToggle(checked: boolean) {
    let updatedData = { ...formData, isIITian: checked };

    if (checked) {
      // IITian courses are always the fixed ₹700 rate — lock it in
      // and discard any manual edit the teacher had made.
      updatedData = withStandardPrice(updatedData);
      setPriceTouched(false);
    } else if (!priceTouched) {
      // Back to a grade-based course — refill with that grade's
      // standard rate, unless the teacher had already set their own.
      updatedData = withStandardPrice(updatedData);
    }

    setFormData(updatedData);
    onChange(updatedData);
  }

  return (
    <div className="space-y-6">
      <CourseConfigFields formData={formData} onChange={handleChange} />
      <CourseDetailFields
        formData={formData}
        onChange={handleChange}
        onIITianToggle={handleIITianToggle}
      />
      <CourseCertificateFields
        formData={formData}
        onChange={handleChange}
        onToggle={handleCertificateToggle}
      />
    </div>
  );
}
