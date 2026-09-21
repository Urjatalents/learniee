import { redirect } from "next/navigation";

/**
 * Homework now lives inside each course's page on My Classes
 * (Part 2C). Kept as a redirect because homework notifications
 * still link here.
 */
export default function ParentHomeworkTestsRedirectPage() {
  redirect("/parent/my-classes");
}
