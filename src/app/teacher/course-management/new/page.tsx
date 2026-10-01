"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";

import CreateCourseForm from "@/features/courses/components/CreateCourseForm";
import CourseMediaUpload from "@/features/courses/components/CourseMediaUpload";
import CourseSection from "@/features/courses/components/CourseSection";
import CourseFormSidebar, { CourseSectionPills } from "@/features/courses/components/CourseFormSidebar";
import { useCreateCourse } from "@/features/courses/hooks/useCreateCourse";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

export default function NewCoursePage() {
  const {
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
    pricingLocked,
    classRequestId,
  } = useCreateCourse();

  // Validation messages arrive after the teacher has scrolled down the long
  // form, so bring them into view.
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  const sidebarProps = {
    formData,
    hasThumbnail: Boolean(thumbnail),
    hasIntroVideo: Boolean(introVideo),
  };

  return (
    <div className="px-4 sm:px-8 pt-6 max-w-7xl mx-auto">
      {/* HEADER + BREADCRUMB */}
      <header className="mb-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
          <Link href="/teacher" className="hover:text-violet-700">
            Teacher
          </Link>
          <ChevronRight size={14} aria-hidden="true" />
          <Link href="/teacher/course-management" className="hover:text-violet-700">
            Course Management
          </Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span className="font-medium text-gray-800" aria-current="page">
            New course
          </span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-violet-700">Create a new course</h1>
            <p className="text-gray-500 mt-1">
              Fill in the details below. Your course is reviewed by our team before parents can join it.
            </p>
          </div>

          <button
            type="button"
            onClick={goToCourseManagement}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to courses
          </button>
        </div>
      </header>

      {classRequestId && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-violet-600" aria-hidden="true" />
          <p>
            You&apos;re listing a course for a class request you accepted. The details below are
            prefilled — adjust anything, add your media and submit. It goes through the normal course
            approval before parents can join.
          </p>
        </div>
      )}

      <div ref={errorRef}>{error && <ErrorBanner>{error}</ErrorBanner>}</div>

      <form onSubmit={handleSubmit} noValidate>
        <CourseSectionPills {...sidebarProps} />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-8 items-start">
          <div className="space-y-6 min-w-0">
            <CreateCourseForm
              onChange={setFormData}
              initialValues={initialValues}
              pricingLocked={pricingLocked}
            />

            <CourseSection id="media">
              <CourseMediaUpload
                thumbnail={thumbnail}
                introVideo={introVideo}
                onThumbnailChange={setThumbnail}
                onIntroVideoChange={setIntroVideo}
              />
            </CourseSection>
          </div>

          <CourseFormSidebar {...sidebarProps} />
        </div>

        {/* ACTION BAR — stays in view while scrolling the long form */}
        <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-8 mt-8 border-t border-violet-100 bg-white/90 px-4 sm:px-8 py-3 backdrop-blur">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={goToCourseManagement}
              disabled={saving}
              className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {saving ? "Saving..." : "Create course"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
