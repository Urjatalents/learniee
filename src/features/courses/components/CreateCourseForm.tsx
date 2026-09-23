"use client";

import { useState } from "react";
import CourseConfigFields from "@/features/courses/components/CourseConfigFields";
import CourseDetailFields from "@/features/courses/components/CourseDetailFields";
import CourseCertificateFields from "@/features/courses/components/CourseCertificateFields";
import { initialCourseFormData, type CourseFormData } from "@/features/courses/types/course";

interface Props {
  onChange: (data: CourseFormData) => void;
}

export default function CreateCourseForm({ onChange }: Props) {
  const [formData, setFormData] = useState<CourseFormData>(initialCourseFormData);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };

    setFormData(updatedData);
    onChange(updatedData);
  }

  function handleCertificateToggle(checked: boolean) {
    const updatedData = { ...formData, certificateEnabled: checked };

    setFormData(updatedData);
    onChange(updatedData);
  }

  function handleIITianToggle(checked: boolean) {
    const updatedData = { ...formData, isIITian: checked };

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
