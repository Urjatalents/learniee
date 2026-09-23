import type { AdminCourse } from "@/features/admin/types/course";

interface Props {
  course: AdminCourse;
  onApprove: (courseId: string) => void;
  onReject: (courseId: string) => void;
}

export default function CourseApprovalCard({
  course,
  onApprove,
  onReject,
}: Props) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm p-8">
      {/* HEADER */}
      <div className="flex justify-between items-start border-b pb-6">
        <div className="flex gap-5">
          <div className="w-28 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {course.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnailUrl}
                alt={course.courseTitle || "Course thumbnail"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-xs text-gray-400">No thumbnail</p>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {course.courseTitle || "Untitled Course"}
            </h2>

            <p className="text-gray-500">
              {course.teacher.firstName} {course.teacher.lastName} ·{" "}
              {course.teacher.email}
            </p>
          </div>
        </div>

        <span className="px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
          {course.status}
        </span>
      </div>

      {/* DETAILS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
        <div>
          <p className="font-medium text-gray-700">Subject</p>
          <p className="text-gray-500">{course.subject || "-"}</p>
        </div>

        <div>
          <p className="font-medium text-gray-700">Grade</p>
          <p className="text-gray-500">{course.grade || "-"}</p>
        </div>

        <div>
          <p className="font-medium text-gray-700">Board</p>
          <p className="text-gray-500">{course.board || "-"}</p>
        </div>

        <div>
          <p className="font-medium text-gray-700">Type</p>
          <p className="text-gray-500">{course.type || "-"}</p>
        </div>

        <div>
          <p className="font-medium text-gray-700">Duration</p>
          <p className="text-gray-500">{course.duration || "-"}</p>
        </div>

        <div>
          <p className="font-medium text-gray-700">Language</p>
          <p className="text-gray-500">{course.language || "-"}</p>
        </div>

        <div>
          <p className="font-medium text-gray-700">Frequency</p>
          <p className="text-gray-500">{course.frequency || "-"}</p>
        </div>

        <div>
          <p className="font-medium text-gray-700">Price</p>
          <p className="text-gray-500">
            {course.price || "-"}
            {course.isIITian && (
              <span className="ml-2 text-xs text-violet-600 font-medium">IITian</span>
            )}
          </p>
        </div>
      </div>

      {course.isPriceCustomized && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Non-standard price</p>
          <p className="text-xs text-amber-700 mt-1">
            The standard rate for this course{course.isIITian ? " (IITian listing)" : ""} is ₹
            {course.standardPrice}/session, but the teacher has set it to ₹{course.price}
            /session.
          </p>
        </div>
      )}

      {course.objective && (
        <div className="mt-4">
          <p className="font-medium text-gray-700 text-sm">Objective</p>
          <p className="text-gray-500 text-sm mt-1">{course.objective}</p>
        </div>
      )}

      {course.description && (
        <div className="mt-4">
          <p className="font-medium text-gray-700 text-sm">Description</p>
          <p className="text-gray-500 text-sm mt-1">{course.description}</p>
        </div>
      )}

      {/* ACTIONS */}
      <div className="flex gap-4 mt-8 pt-6 border-t">
        <button
          onClick={() => onApprove(course.id)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
        >
          Approve
        </button>

        <button
          onClick={() => onReject(course.id)}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
