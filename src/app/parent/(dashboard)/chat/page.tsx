import { redirect } from "next/navigation";

/**
 * The chat list is now part of My Classes (Part 2C): each course's
 * page has its own Chat tab. Kept as a redirect for older links.
 */
export default function ParentChatRedirectPage() {
  redirect("/parent/my-classes");
}
