import { LEGAL_CONTACT } from "./contact";
import type { LegalDocument } from "./types";

export const REFUNDS: LegalDocument = {
  title: "Refund & Cancellation Policy",
  subtitle: "Our general rule, the exceptions, and exactly how each refund is calculated.",
  lastUpdated: "12 October 2026",
  sections: [
    {
      id: "overview",
      title: "Overview",
      clauses: [
        { text: "Learniee sells live classes in Cycles (a month, or a week for weekly plans). You pay for each Cycle in advance, after choosing your class days and start date. An Educator sets aside time for every booked class, whether or not the Learner attends." },
        { lead: "General rule.", text: "**We do not give refunds once classes have started.** The fee for a Cycle that has started is not refundable, and there is no part-Cycle cancellation." },
        { lead: "Exceptions.", text: "We do refund in the cases listed in this policy: before the Cycle starts, when a class you paid for was not delivered because of the Educator or Learniee, and when a payment goes wrong. Each exception says how the amount is calculated." },
        { text: "This policy is part of our [[Terms & Conditions|/terms]]. All amounts are in Indian rupees (INR)." },
      ],
    },
    {
      id: "calculation",
      title: "How Refunds Are Calculated",
      clauses: [
        { lead: "Per-class fee.", text: "The Cycle fee you paid (not counting any international surcharge) divided by the number of classes booked in that Cycle." },
        { lead: "Classes that count.", text: "A class counts as taken if it was held, if the Learner did not attend while the Educator was present, or if you cancelled it less than 4 hours before it started. These classes are never refunded." },
        { lead: "Undelivered classes.", text: "A class that did not happen because of the Educator or Learniee (see \"When the Educator or Learniee Cannot Deliver\") and was not replaced by a make-up class within the Cycle." },
        { lead: "Refund for undelivered classes", text: "= per-class fee × number of undelivered classes." },
        { lead: "International surcharge.", text: "If you paid an international surcharge, you get back the same share of it: surcharge × (undelivered classes ÷ classes booked). In a full refund, the whole surcharge is returned." },
        { lead: "Example.", text: "A Cycle of 8 classes costs ₹4,800, so the per-class fee is ₹600. The Educator misses 2 classes and no make-up fits in the Cycle. Refund = 2 × ₹600 = ₹1,200. If you also paid a ₹144 surcharge, you get back 2 ÷ 8 × ₹144 = ₹36 more, so ₹1,236 in total." },
        { text: "Amounts are rounded to the nearest rupee. The same method applies to weekly plans, using the weekly fee and the number of classes in that week." },
      ],
    },
    {
      id: "demos",
      title: "Demo Classes & Coupons",
      clauses: [
        { text: "The first two demo classes on an account are free. Paid demos (₹100 each, plus any international surcharge) and demo coupons bought in bulk are refundable only in these cases:", bullets: [
          "The payment was taken but the demo or the coupons were not delivered. Refund: the full amount paid.",
          "You were charged twice for the same purchase. Refund: the extra payment in full.",
          "The demo did not take place because the Educator did not attend or cancelled, and you do not want to rebook it. Refund: the full price of that demo. Where possible we will instead return the demo to you.",
        ] },
        { text: "A demo that was attended is not refundable. Unused coupons are not refundable, but they stay in your account." },
      ],
    },
    {
      id: "before-approval",
      title: "Before Your Enrollment Is Approved",
      clauses: [
        { text: "You pay when you book, but the Enrollment starts only when both the Educator and Learniee approve it. In the cases below you get a **full refund** of the amount you paid, including any international surcharge." },
        { lead: "Rejected Enrollment.", text: "The Educator or Learniee rejects your Enrollment." },
        { lead: "Changes you do not agree to.", text: "The Educator proposes a different start date or schedule that changes the fee, or that you do not want, and you decline it." },
        { lead: "Not approved in time.", text: "The start date passes before the Enrollment is approved and it cannot be revised to a date that suits you." },
        { lead: "You change your mind.", text: "You ask to cancel before the Enrollment is approved." },
      ],
    },
    {
      id: "before-start",
      title: "Cancelling Before the First Class",
      clauses: [
        { text: "If you ask to cancel an approved Enrollment at least 24 hours before its first class, and no class has been held, you get a full refund of the Cycle fee." },
        { text: "If you ask less than 24 hours before the first class, the Cycle is treated as started and the general rule below applies." },
      ],
    },
    {
      id: "after-approval",
      title: "Once the Cycle Has Started",
      clauses: [
        { lead: "A Cycle has started", text: "once its first class has been held, or once the first class is less than 24 hours away." },
        { lead: "No refunds after the start.", text: "The fee covers the classes booked for the Cycle. There is no refund for classes that were held, that the Learner missed, or that you cancelled, and no refund if you simply stop attending. You can stop at any time by not renewing; the Enrollment then ends when the Cycle closes." },
        { lead: "Classes you cancel.", text: "A class you cancel at least 4 hours before it starts is not a late cancellation, but it does not count and is not made up or refunded automatically. To keep the class, reschedule it instead (see the [[Terms|/terms#classes]]). You can reschedule a class up to 2 times." },
        { lead: "Late cancellations and absences.", text: "A class you cancel less than 4 hours before it starts, or that the Learner does not attend while the Educator is present, counts as taken and is not refundable." },
        { lead: "Technical problems on your side", text: "(your internet, device or power) are not a reason for a refund, but tell the Educator or support early so the class can be rescheduled where possible." },
        { text: "The only exceptions after the start are those in the next section and in \"Payment Problems\"." },
      ],
    },
    {
      id: "our-fault",
      title: "When the Educator or Learniee Cannot Deliver",
      clauses: [
        { lead: "Make-up first.", text: "If the Educator misses or cancels a class, or nobody joins, the class does not count. We arrange a make-up class at the next free slot on your regular day and time within the Cycle, and you will be notified. Nothing is refunded while a make-up is possible." },
        { lead: "Educator absent or cancelled, no make-up possible.", text: "Refund = per-class fee × each such class that was not made up by the end of the Cycle." },
        { lead: "Educator on approved leave.", text: "Their classes in that period are moved to the next free slots. If no slot fits, the class is marked excused: it does not count, and the make-up deadline for it is extended by up to 30 days after the Cycle's normal 45-day window. If it still cannot be made up, refund = per-class fee × each such class." },
        { lead: "A class you reported.", text: "Use \"Report a problem\" within 48 hours of the class outcome. Learniee reviews the report, may change the outcome and will tell you the decision. If the class is decided as not delivered, the make-up or the refund above applies." },
        { lead: "Educator removed for conduct.", text: "If the Educator's conduct breaches our code of conduct, contact us straight away. We may remove the Educator or offer a replacement. If you do not want a replacement, refund = per-class fee × every class of the Cycle not yet held and every class held that Learniee finds was not delivered properly." },
        { lead: "We cannot provide the service for any other reason.", text: "Refund = per-class fee × the classes not delivered." },
        { text: "Refunds in this section are calculated as set out in \"How Refunds Are Calculated\" and may be returned to your Wallet if you prefer." },
      ],
    },
    {
      id: "renewals",
      title: "Renewals",
      clauses: [
        { text: "A renewal pays for the next Cycle. Once that Cycle has started, the same rules apply as for a new Enrollment." },
        { text: "You can renew from 7 days before the current Cycle ends. If you ask to cancel a renewal at least 24 hours before its first class, and no class has been held, you get a full refund." },
        { text: "If a renewal payment succeeds but your next Cycle is not created (for example because the page closed or the Enrollment had already ended), contact support with your payment ID. We will complete the renewal or refund you in full." },
      ],
    },
    {
      id: "payment-problems",
      title: "Payment Problems",
      clauses: [
        { text: "These are refunded in full, at any time, because the class was never properly booked or the charge was wrong." },
        { lead: "Booking failed.", text: "If your money was taken but the booking failed, the amount is normally returned automatically by the payment processor to your original payment method within 5 to 7 working days. If it is not, contact support with your payment ID." },
        { lead: "Price changed while you paid.", text: "If the amount you paid no longer matches the current price, the booking may not go through. Contact support with your payment ID and we will refund you in full or complete the booking at the correct price, as you choose." },
        { lead: "Double charge.", text: "If you are charged twice for the same booking, the extra payment is refunded in full." },
      ],
    },
    {
      id: "wallet",
      title: "Wallet & Referral Rewards",
      clauses: [
        { text: "Money you add to your Wallet is credit for use on Learniee. It is not refundable to your bank, but if you added money by mistake or were charged twice, contact us." },
        { text: "Where we refund an amount to your Wallet instead of your original payment method (for example at your request, or for goodwill credits and adjustments), it is credited in full and shown in your Wallet." },
        { text: "Referral rewards are Wallet credit only. They have no cash value. If the Enrollment that earned a reward is fully refunded, we may reverse the reward." },
      ],
    },
    {
      id: "how-to-claim",
      title: "How to Ask for a Refund",
      clauses: [
        { text: `Write to ${LEGAL_CONTACT.email} or message us on WhatsApp at ${LEGAL_CONTACT.whatsapp}. Include your registered e-mail or phone number, the Learner's name, the course, and your payment ID or invoice number (you can find them under Payments in your account).` },
        { text: "Ask within 7 days of the payment for refunds before approval, before the first class and for payment problems. For classes not delivered, ask within 7 days after the Cycle closes, because we can only tell then whether a make-up was possible. We will still look at later requests where the delay was not your fault." },
        { text: "We will confirm receipt and reply within 3 working days, with the number of classes we counted and how the refund was worked out." },
      ],
    },
    {
      id: "how-refunded",
      title: "How and When You Are Refunded",
      clauses: [
        { text: "Approved refunds are returned to the original payment method through our payment processor. Once approved we start the refund within 7 working days. Your bank may then take a further 5 to 7 working days to show it." },
        { text: "If a refund is due because of our fault or a failed booking, it includes the matching share of any international surcharge. For a refund you request for your own reasons (cancelling before approval or before the first class), payment-processing charges that we cannot recover may be deducted." },
        { text: "Where you prefer, or where a refund to the original method is not possible, we may credit your Wallet instead." },
      ],
    },
    {
      id: "not-refundable",
      title: "What Is Not Refundable",
      clauses: [
        { text: "Classes that were held, missed by the Learner, or cancelled late." },
        { text: "Classes you cancelled at least 4 hours ahead and did not reschedule." },
        { text: "The unused part of a Cycle when you stop attending, or ask to cancel after the Cycle has started." },
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
