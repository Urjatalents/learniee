export interface ParentCourseDetailTeacher {
  id: string;
  firstName: string;
  lastName: string;
  visibleName: string | null;
  aboutMe: string | null;
  city: string | null;
  country: string | null;
  photoUrl: string | null;
  introVideoUrl: string | null;
  /**
   * The teacher's own overall average rating across every review
   * they've received (see getTeacherRatingSummary in
   * review.service.ts) — null when they have none yet.
   */
  averageRating: number | null;
  reviewCount: number;
}

export interface ParentCourseDetail {
  id: string;
  teacherId: string;

  category: string | null;
  timeSlot: string | null;

  subject: string | null;
  grade: string | null;
  board: string | null;
  experience: string | null;

  duration: string | null;
  type: string | null;
  language: string | null;
  frequency: string | null;

  courseTitle: string | null;
  objective: string | null;
  description: string | null;

  modules: string | null;
  courseTags: string | null;
  price: string | null;

  thumbnailUrl: string | null;
  introVideoUrl: string | null;

  status: "APPROVED";
  createdAt: string;

  teacher: ParentCourseDetailTeacher;
}

