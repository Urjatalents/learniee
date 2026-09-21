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
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderRole: ChatSenderRole;
  senderId: string;
  body: string;
  createdAt: string;
}

/** Renders a display name consistently across every chat surface. */
export function displayName(party: ChatPartyRef): string {
  return party.visibleName?.trim() || `${party.firstName} ${party.lastName}`.trim();
}
