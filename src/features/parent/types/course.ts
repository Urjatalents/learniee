export interface ParentCourse {
  id: string;
  teacherId: string;

  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    visibleName: string | null;
    /**
     * The teacher's own overall average rating, averaged across every
     * review they've received on any of their courses (see
     * getTeacherRatingsByIds in review.service.ts) — null when they
     * have none yet. Never teacher-entered; Course.rating (the old
     * free-typed field) is deprecated and no longer used for display.
     */
    averageRating: number | null;
    reviewCount: number;
  };

  subject: string | null;
  grade: string | null;
  board: string | null;
  type: string | null;

  courseTitle: string | null;
  price: string | null;

  thumbnailUrl: string | null;

  status: "APPROVED";

  createdAt: string;
}
