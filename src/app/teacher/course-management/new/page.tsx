"use client";

import CreateCourseForm from "@/features/courses/components/CreateCourseForm";
import CourseMediaUpload from "@/features/courses/components/CourseMediaUpload";
import { useCreateCourse } from "@/features/courses/hooks/useCreateCourse";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

export default function NewCoursePage() {
  const {
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
  } = useCreateCourse();

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        <main className="flex-1 min-w-0 p-5 sm:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <button
                  type="button"
                  onClick={goToCourseManagement}
                  className="hover:text-purple-600"
                >
                  Teacher
                </button>

                <span>›</span>

                <button
                  type="button"
                  onClick={goToCourseManagement}
                  className="hover:text-purple-600"
                >
                  Course Management
                </button>

                <span>›</span>

                <span className="text-gray-700">New Course</span>
              </div>

              <h1 className="text-3xl font-bold text-purple-600">New Course</h1>
              <p className="text-gray-500 mt-1">
                Create a new course and publish it for students.
              </p>
            </div>

            {classRequestId && (
              <div className="mb-6 rounded-lg bg-purple-50 text-purple-800 text-sm p-4">
                You&apos;re listing a course for a class request you accepted. The details below are
                prefilled — adjust anything, add your media and submit. It goes through the normal
                course approval before parents can join.
              </div>
            )}

            {error && (
              <ErrorBanner>{error}</ErrorBanner>
            )}

            <div className="bg-white border rounded-2xl p-6 sm:p-8 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-10">
                <CreateCourseForm onChange={setFormData} initialValues={initialValues} />

                <CourseMediaUpload
                  thumbnail={thumbnail}
                  introVideo={introVideo}
                  onThumbnailChange={setThumbnail}
                  onIntroVideoChange={setIntroVideo}
                />

                <div className="flex justify-end gap-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={goToCourseManagement}
                    disabled={saving}
                    className="px-7 py-3 rounded-lg border border-purple-600 text-purple-600 hover:bg-purple-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Create Course"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
