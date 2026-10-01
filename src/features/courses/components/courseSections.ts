import { BookOpen, Clock, GraduationCap, ImagePlus, IndianRupee, Award, type LucideIcon } from "lucide-react";

export interface CourseSectionMeta {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Shown as an "Optional" tag. */
  optional?: boolean;
}

/** Order here is the order on the page, in the section nav and in the progress count. */
export const COURSE_SECTIONS: CourseSectionMeta[] = [
  { id: "basics", label: "Course basics", description: "What the course is about, in your own words.", icon: BookOpen },
  { id: "audience", label: "Subject & learners", description: "Who the course is for and what it covers.", icon: GraduationCap },
  { id: "format", label: "Lecture format", description: "How long, how often and how it is taught.", icon: Clock },
  { id: "pricing", label: "Pricing", description: "The price parents pay per lecture.", icon: IndianRupee },
  { id: "certificate", label: "Certificate", description: "Reward students who complete enough sessions.", icon: Award, optional: true },
  { id: "media", label: "Course media", description: "A thumbnail and a short intro video.", icon: ImagePlus },
];

export function getSectionMeta(id: string): CourseSectionMeta {
  const meta = COURSE_SECTIONS.find((s) => s.id === id);

  if (!meta) throw new Error(`Unknown course section: ${id}`);

  return meta;
}
