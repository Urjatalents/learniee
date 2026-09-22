export type ChatSenderRole = "PARENT" | "TEACHER";

export interface ChatPartyRef {
  id: string;
  firstName: string;
  lastName: string;
  visibleName: string | null;
}

export interface ChatRoomSummary {
  id: string;
  lastMessageAt: string | null;
  createdAt: string;
  parent: ChatPartyRef;
  teacher: ChatPartyRef;
  student: { id: string; firstName: string; lastName: string; visibleName: string | null };
  course: { id: string; courseTitle: string | null; subject: string | null };
  enrollment: { id: string; status: string; isLegacy: boolean };
  _count: { messages: number };
  /** Admin listing only (06 #31) — undefined on Parent/Teacher rooms. */
  hasFlaggedMessages?: boolean;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderRole: ChatSenderRole;
  senderId: string;
  body: string;
  createdAt: string;
  /** True when `body` had a phone number masked out of it (06 #31). */
  containsPhoneNumber: boolean;
  /**
   * The unmasked text — only ever present on the Admin messages route
   * (`/api/admin/chat/[roomId]/messages`), and only when the message
   * was flagged. Parent/Teacher responses never include this field.
   */
  originalBody?: string | null;
}

/** Renders a display name consistently across every chat surface. */
export function displayName(party: ChatPartyRef): string {
  return party.visibleName?.trim() || `${party.firstName} ${party.lastName}`.trim();
}
