import {
    createNotification,
    notifyAllAdmins
} from "@/features/shared/server/notification.service";
import "server-only";
import { R, T, safe } from './shared';

// ---------------------------------------------------------------------------
// Refund requests (Oct 12, 2026)
// ---------------------------------------------------------------------------

/** A Parent asked for a refund — every Admin gets told. */
export function notifyRefundRequestSubmitted(input: { parentName: string; description: string }) {
  return safe("refund request submitted", async () => {
    await notifyAllAdmins({
      type: T.REFUND_REQUEST_SUBMITTED,
      title: "New refund request",
      message: `${input.parentName} asked for a refund for "${input.description}".`,
      link: "/admin/refund-requests",
    });
  });
}
/** Admin decided — tells the Parent (approved = credited to their Wallet). */
export function notifyRefundRequestDecided(input: {
  parentId: string;
  outcome: "APPROVED" | "REJECTED";
  amount?: number;
  adminNote?: string | null;
}) {
  return safe("refund request decided", async () => {
    const note = input.adminNote ? ` Note: ${input.adminNote}` : "";

    await createNotification({
      recipientId: input.parentId,
      recipientRole: R.PARENT,
      type: T.REFUND_REQUEST_DECIDED,
      title: input.outcome === "APPROVED" ? "Refund approved" : "Refund request update",
      message:
        input.outcome === "APPROVED"
          ? `Your refund of ₹${(input.amount ?? 0).toLocaleString("en-IN")} was approved and added to your wallet.${note}`
          : `Your refund request was not approved.${note}`,
      link: input.outcome === "APPROVED" ? "/parent/wallet" : "/parent/payments",
    });
  });
}
