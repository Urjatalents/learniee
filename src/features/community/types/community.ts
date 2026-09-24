export type CommunityRole = "TEACHER" | "ADMIN" | "ACCOUNTS" | "HR" | "IT";

export const COMMUNITY_ROLE_LABEL: Record<CommunityRole, string> = {
  TEACHER: "Teacher",
  ADMIN: "Admin",
  ACCOUNTS: "Accounts",
  HR: "HR",
  IT: "IT",
};

export const COMMUNITY_MAX_MESSAGE_LENGTH = 2000;

export interface CommunityMessageDto {
  id: string;
  senderRole: CommunityRole;
  senderId: string;
  senderName: string;
  /** Empty string when `deleted` is true. */
  body: string;
  isAnnouncement: boolean;
  deleted: boolean;
  createdAt: string;
  /** Polling cursor — also moves when a message is deleted. */
  updatedAt: string;
}

export interface CommunityViewer {
  role: CommunityRole;
  id: string;
  name: string;
  /** Admin only: can broadcast announcements. */
  canAnnounce: boolean;
  /** Admin only: can remove any message. */
  canModerate: boolean;
}
