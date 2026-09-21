export interface CourseFormData {
  category: string;
  timeSlot: string;

  subject: string;
  grade: string;
  board: string;
  experience: string;

  duration: string;
  type: string;
  language: string;
  frequency: string;

  courseTitle: string;
  rating: string;
  objective: string;
  description: string;

  modules: string;
  courseTags: string;
  price: string;

  certificateEnabled: boolean;
  certificateSessionThreshold: string;
}

export const initialCourseFormData: CourseFormData = {
  category: "",
  timeSlot: "",

  subject: "",
  grade: "",
  board: "",
  experience: "",

  duration: "",
  type: "",
  language: "",
  frequency: "",

  courseTitle: "",
  rating: "",
  objective: "",
  description: "",

  modules: "",
  courseTags: "",
  price: "",

  certificateEnabled: false,
  certificateSessionThreshold: "",
};

/**
 * Shape used by CourseCard (Teacher's own course list) — a subset of
 * the full Course record returned by GET /api/teacher/course.
 */
export interface TeacherCourseSummary {
  id: string;
  courseTitle: string | null;
  subject: string | null;
  grade: string | null;
  board: string | null;
  type: string | null;
  price: string | null;
  thumbnailKey: string | null;
  introVideoKey: string | null;
  createdAt: string;
}
