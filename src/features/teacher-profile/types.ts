import type { ParentCourse } from "@/features/parent/types/course";

/** What any signed-in Parent/Teacher may see about an approved Teacher. No contact details. */
export interface TeacherPublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  visibleName: string | null;
  aboutMe: string | null;
  city: string | null;
  country: string | null;
  photoUrl: string | null;
  introVideoUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
}

export interface TeacherPublicProfileResponse {
  teacher: TeacherPublicProfile;
  courses: ParentCourse[];
}
