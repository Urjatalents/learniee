import { LEGAL_CONTACT, LEGAL_LAST_UPDATED } from "./contact";
import type { LegalDocument } from "./types";

export const REFUNDS: LegalDocument = {
  title: "Refund & Cancellation Policy",
  subtitle: "When you can get your money back, how to ask, and how long it takes.",
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      id: "overview",
      title: "Overview",
      clauses: [
        { text: "Learniee sells live classes by the month. You pay for each monthly Cycle in advance, after choosing your class days and start date. We want you to be treated fairly if something goes wrong on our side, and we also need to protect the Educator's time, since a class that is held or missed by the Learner is still time the Educator set aside." },
        { text: "This policy is part of our [[Terms & Conditions|/terms]]. All amounts are in Indian rupees (INR)." },
      ],
    },
    {
      id: "demos",
      title: "Demo Classes & Coupons",
      clauses: [
        { text: "The first two demo classes on an account are free. Paid demos (₹100 each, plus any international surcharge) and demo coupons bought in bulk are refundable only in these cases:", bullets: [
          "The payment was taken but the demo or the coupons were not delivered.",
          "You were charged twice for the same purchase.",
          "The demo did not take place because the Educator did not attend or cancelled, and you do not want to rebook it. Where possible we will instead return the demo to you.",
        ] },
        { text: "A demo that was attended is not refundable. Coupons that are still unused are not refundable, but they stay in your account." },
      ],
    },
    {
      id: "before-approval",
      title: "Before Your Enrollment Is Approved",
      clauses: [
        { text: "You pay when you book, but the Enrollment starts only when both the Educator and Learniee approve it." },
        { lead: "Rejected Enrollment.", text: "If the Educator or Learniee rejects your Enrollment, you get a **full refund** of the amount you paid, including any international surcharge." },
        { lead: "Changes you do not agree to.", text: "If the Educator proposes a different start date or schedule that changes the fee, or that you do not want, you can decline it and get a **full refund**." },
        { lead: "Not approved in time.", text: "If the start date passes before the Enrollment is approved and it cannot be revised to a date that suits you, you get a **full refund**." },
        { lead: "You change your mind.", text: "If you ask to cancel before the Enrollment is approved, you get a full refund." },
      ],
    },
    {
      id: "after-approval",
      title: "Once the Cycle Has Started",
      clauses: [
        { lead: "The Cycle is a paid month.", text: "After approval, the fee covers the classes booked for that Cycle. There is no part-month cancellation. You can stop at any time by not renewing; the Enrollment then ends when the Cycle closes." },
        { lead: "Cancel before the first class.", text: "If you ask to cancel an approved Enrollment at least 24 hours before its first class, and no class has been held, you get a full refund." },
        { lead: "After the first class.", text: "Fees for the Cycle are not refundable for classes that were held, that you missed, or that you cancelled late, except as set out below." },
        { lead: "Classes you cancel.", text: "A class you cancel at least 4 hours before it starts is not a late cancellation, but it does not count and is not made up automatically. To keep the class, reschedule it instead (see the [[Terms|/terms#classes]])." },
        { lead: "Late cancellations and absences.", text: "A class you cancel less than 4 hours before it starts, or that the Learner does not attend while the Educator is present, counts as taken and is not refundable." },
        { lead: "Technical problems on your side", text: "(your internet, device or power) are not a reason for a refund, but tell the Educator or support early so the class can be rescheduled where possible." },
      ],
    },
    {
      id: "our-fault",
      title: "When the Educator or Learniee Cannot Deliver",
      clauses: [
        { text: "If the Educator misses or cancels a class, or nobody joins, the class does not count. We arrange a make-up class at the next free slot on your regular day and time within the Cycle, and you will be notified." },
        { text: "If we cannot give you a make-up class within the Cycle, contact support and we will refund or credit the fee for each class that was not delivered, worked out as the per-class rate for the Cycle." },
        { text: "If the Educator is on approved leave, their classes in that period are moved to the next free slots. If no slot fits, that class is cancelled and not counted, and you are entitled to the same remedy." },
        { text: "If a class had a problem, use \"Report a problem\" within 48 hours of the class outcome. Learniee reviews the report, may change the outcome and will tell you the decision. Where a class is decided as not delivered, the make-up or refund above applies." },
        { text: "If the Educator's conduct breaches our code of conduct, contact us straight away. Depending on the case we may remove the Educator, provide a replacement Educator, and refund the undelivered part of the Cycle." },
        { text: "If we cannot provide the service for any other reason, you get a refund for the part not delivered." },
      ],
    },
    {
      id: "renewals",
      title: "Renewals",
      clauses: [
        { text: "A renewal pays for the next Cycle. The same rules apply as for a new Enrollment once the Cycle has started." },
        { text: "You can renew from 7 days before the current Cycle ends. If you change your mind and ask to cancel a renewal at least 24 hours before its first class, and no class has been held, you get a full refund." },
        { text: "If a renewal payment succeeds but your next Cycle is not created (for example because the page closed or the Enrollment had already ended), contact support with your payment ID. We will complete the renewal or refund you in full." },
      ],
    },
    {
      id: "payment-problems",
      title: "Payment Problems",
      clauses: [
        { text: "If your money was taken but the booking failed, the amount is normally returned automatically by the payment processor to your original payment method within 5 to 7 working days. If it is not, contact support with your payment ID." },
        { text: "If the amount you paid no longer matches the current price (for example, the price changed while you were paying), the booking may not go through. Contact support with your payment ID and we will refund you in full or complete the booking at the correct price, as you choose." },
        { text: "If you are charged twice for the same booking, the extra payment is refunded in full." },
      ],
    },
    {
      id: "wallet",
      title: "Wallet & Referral Rewards",
      clauses: [
        { text: "Money you add to your Wallet is credit for use on Learniee. It is not refundable to your bank, but if you added money by mistake or were charged twice, contact us." },
        { text: "Where we refund an amount to your Wallet instead of your original payment method (for example goodwill credits and adjustments), it is credited in full and shown in your Wallet." },
        { text: "Referral rewards are Wallet credit only. They have no cash value. If the Enrollment that earned a reward is fully refunded, we may reverse the reward." },
      ],
    },
    {
      id: "how-to-claim",
      title: "How to Ask for a Refund",
      clauses: [
        { text: `Write to ${LEGAL_CONTACT.email} or message us on WhatsApp at ${LEGAL_CONTACT.whatsapp}. Include your registered e-mail or phone number, the Learner's name, the course, and your payment ID or invoice number (you can find them under Payments in your account).` },
        { text: "Ask within 7 days of the payment, or within 7 days of the problem for cases in the section on when we cannot deliver, so that we can check what happened while it is fresh. We will still look at later requests where the delay was not your fault." },
        { text: "We will confirm receipt and reply within 3 working days." },
      ],
    },
    {
      id: "how-refunded",
      title: "How and When You Are Refunded",
      clauses: [
        { text: "Approved refunds are returned to the original payment method through our payment processor. Once approved we start the refund within 7 working days. Your bank may then take a further 5 to 7 working days to show it." },
        { text: "The refund covers the amount you paid for the Cycle or purchase. If a refund is due because of our fault or a failed booking, it includes any international surcharge. For a refund you request for your own reasons, payment-processing charges that we cannot recover may be deducted." },
        { text: "Where you prefer, or where a refund to the original method is not possible, we may credit your Wallet instead." },
      ],
    },
    {
      id: "not-refundable",
      title: "What Is Not Refundable",
      clauses: [
        { text: "Classes that were held, missed by the Learner, or cancelled late." },
        { text: "Unused portions of a Cycle when you simply stop attending, or ask to cancel after the first class." },
        { text: "Attended demo classes and unused demo coupons." },
        { text: "Wallet balance, and referral rewards." },
        { text: "Dissatisfaction with results or grades. We do not guarantee any grade or exam result. If you are unhappy with a class, use the Report option or contact us and we will look for a fix, such as a replacement Educator." },
      ],
    },
    {
      id: "changes",
      title: "Changes & Contact",
      clauses: [
        { text: "We may update this policy from time to time. Changes apply to payments made after the change. A Cycle you have already paid for is covered by the policy in force when you paid." },
        { text: `Questions: ${LEGAL_CONTACT.email}, WhatsApp ${LEGAL_CONTACT.whatsapp}, phone ${LEGAL_CONTACT.phone}. ${LEGAL_CONTACT.entity}, ${LEGAL_CONTACT.location}.` },
      ],
    },
  ],
};
