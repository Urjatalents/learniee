export interface CourseFormData {
  category: string;
  timeSlot: string;

  subject: string;
  /** Final stored value, derived from gradeMode/gradeFrom/gradeTo by the form. */
  grade: string;
  gradeMode: "single" | "range";
  gradeFrom: string;
  gradeTo: string;
  /** Free text, used when `subject` is "Other". */
  subjectOther: string;
  board: string;
  experience: string;

  duration: string;
  type: string;
  language: string;
  frequency: string;
  /** Used when `frequency` is "Custom". */
  frequencyCustom: string;

  courseTitle: string;
  objective: string;
  description: string;

  modules: string;
  /** Number of modules, used when `modules` is "Custom". */
  moduleCustom: string;
  courseTags: string;
  price: string;
  isIITian: boolean;

  certificateEnabled: boolean;
  certificateSessionThreshold: string;
}

export const initialCourseFormData: CourseFormData = {
  category: "",
  timeSlot: "",

  subject: "",
  grade: "",
  gradeMode: "single",
  gradeFrom: "",
  gradeTo: "",
  subjectOther: "",
  board: "",
  experience: "",

  duration: "",
  type: "",
  language: "",
  frequency: "",
  frequencyCustom: "",

  courseTitle: "",
  objective: "",
  description: "",

  modules: "",
  moduleCustom: "",
  courseTags: "",
  price: "",
  isIITian: false,

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
