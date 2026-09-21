import { redirect } from "next/navigation";

/**
 * "My Enrollments" is now "My Classes" (Part 2C). Kept as a redirect
 * because notifications and older links still point here.
 */
export default function ParentEnrollmentsRedirectPage() {
  redirect("/parent/my-classes");
}
