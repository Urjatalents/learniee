/** Last message of a chat room, for the My Classes > Messages list. */
export interface ChatPreview {
  chatRoomId: string;
  body: string;
  senderRole: "PARENT" | "TEACHER";
  /** ISO instant. */
  createdAt: string;
}
