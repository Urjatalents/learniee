import { LEGAL_CONTACT } from "./contact";
import type { LegalDocument } from "./types";

export const REFUNDS: LegalDocument = {
  title: "Refund & Cancellation Policy",
  subtitle: "No refund is paid until an admin approves it. Here are the rules and the cases in which you can ask for one.",
  lastUpdated: "12 October 2026",
  sections: [
    {
      id: "overview",
      title: "Overview",
      clauses: [
        { text: "Learniee sells live classes in Cycles (a month, or a week for weekly plans). You pay for each Cycle in advance, after choosing your class days and start date. An Educator sets aside time for every booked class, whether or not the Learner attends." },
        { lead: "Admin approval.", text: "**We do not refund anything until it has been approved by a Learniee admin.** Every refund starts as a request you send from the Payments page in your account, against the payment you want refunded. The admin decides whether to refund and how much. Meeting a condition in this policy makes you eligible to ask; it is not a promise of payment until the admin approves." },
        { lead: "Paid to your Wallet.", text: "An approved refund is added to your Learniee Wallet. **We do not make refunds by bank transfer, card, UPI or any other method.**" },
        { lead: "General rule.", text: "**We generally do not refund once classes have started.** The fee for a Cycle that has started is not refundable, and there is no part-Cycle cancellation." },
        { lead: "Exceptions.", text: "We do refund in the cases listed in this policy: before the Cycle starts, when a class you paid for was not delivered because of the Educator or Learniee, and when a payment goes wrong. The admin still has to approve each one." },
        { text: "This policy is part of our [[Terms & Conditions|/terms]]. All amounts are in Indian rupees (INR)." },
      ],
    },
    {
      id: "amount",
      title: "How the Refund Amount Is Decided",
      clauses: [
        { text: "The admin decides the refund amount on each request. It is never more than you paid for that payment, minus any refund already approved for it." },
        { text: "For classes that were not delivered, the admin looks at the classes missed by the Educator or Learniee and not made up within the Cycle, and the fee you paid for them. Classes that were held, missed by the Learner or cancelled late are not refunded." },
        { text: "The admin may approve the full amount you paid, part of it, or decline. You will see the amount approved, or the reason it was declined, next to the payment." },
      ],
    },
    {
      id: "demos",
      title: "Demo Classes & Coupons",
      clauses: [
        { text: "The first two demo classes on an account are free. Paid demos (₹100 each, plus any international surcharge) and demo coupons bought in bulk are refundable only in these cases:", bullets: [
          "The payment was taken but the demo or the coupons were not delivered. You can ask for the full amount paid.",
          "You were charged twice for the same purchase. You can ask for the extra payment in full.",
          "The demo did not take place because the Educator did not attend or cancelled, and you do not want to rebook it. You can ask for the full price of that demo. Where possible we will instead return the demo to you.",
        ] },
        { text: "A demo that was attended is not refundable. Unused coupons are not refundable, but they stay in your account." },
      ],
    },
    {
      id: "before-approval",
      title: "Before Your Enrollment Is Approved",
      clauses: [
        { text: "You pay when you book, but the Enrollment starts only when both the Educator and Learniee approve it. In the cases below you are eligible to ask for a **full refund** of the amount you paid, including any international surcharge. Refunds are paid only after admin approval." },
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
        { text: "If you ask to cancel an approved Enrollment at least 24 hours before its first class, and no class has been held, you are eligible to ask for a full refund of the Cycle fee, subject to admin approval." },
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
        { lead: "Educator absent or cancelled, no make-up possible.", text: "You can ask for a refund for each such class that was not made up by the end of the Cycle." },
        { lead: "Educator on approved leave.", text: "Their classes in that period are moved to the next free slots. If no slot fits, the class is marked excused: it does not count, and the make-up deadline for it is extended by up to 30 days after the Cycle's normal 45-day window. If it still cannot be made up, you can ask for a refund for each such class." },
        { lead: "A class you reported.", text: "Use \"Report a problem\" within 48 hours of the class outcome. Learniee reviews the report, may change the outcome and will tell you the decision. If the class is decided as not delivered, the make-up or the refund above applies." },
        { lead: "Educator removed for conduct.", text: "If the Educator's conduct breaches our code of conduct, contact us straight away. We may remove the Educator or offer a replacement. If you do not want a replacement, you can ask for a refund for the classes of the Cycle not yet held and any class that Learniee finds was not delivered properly." },
        { lead: "We cannot provide the service for any other reason.", text: "You can ask for a refund for the classes not delivered." },
        { text: "Refunds in this section are decided by the admin as set out in \"How the Refund Amount Is Decided\"." },
      ],
    },
    {
      id: "renewals",
      title: "Renewals",
      clauses: [
        { text: "A renewal pays for the next Cycle. Once that Cycle has started, the same rules apply as for a new Enrollment." },
        { text: "You can renew from 7 days before the current Cycle ends. If you ask to cancel a renewal at least 24 hours before its first class, and no class has been held, you are eligible to ask for a full refund, subject to admin approval." },
        { text: "If a renewal payment succeeds but your next Cycle is not created (for example because the page closed or the Enrollment had already ended), send a refund request or contact support with your payment ID. We will complete the renewal or, if the admin approves, credit your Wallet in full." },
      ],
    },
    {
      id: "payment-problems",
      title: "Payment Problems",
      clauses: [
        { text: "For these you can ask for a full refund at any time, because the class was never properly booked or the charge was wrong. As with every refund, it is paid to your Wallet after an admin approves it." },
        { lead: "Booking failed.", text: "If your money was taken but the booking failed, any amount that your bank or the payment processor reverses on its own is between you and them and is not a Learniee refund. If it is not reversed, send a refund request with your payment ID." },
        { lead: "Price changed while you paid.", text: "If the amount you paid no longer matches the current price, the booking may not go through. Send a refund request with your payment ID. If the admin approves it we credit your Wallet in full, or we complete the booking at the correct price, as you choose." },
        { lead: "Double charge.", text: "If you are charged twice for the same booking, send a refund request with both payment IDs. If the admin approves it, the extra payment is credited to your Wallet in full." },
      ],
    },
    {
      id: "wallet",
      title: "Wallet & Referral Rewards",
      clauses: [
        { text: "Refunds are paid into your Learniee Wallet as credit, and are shown in your Wallet history. Wallet credit is not paid out to your bank, card or UPI." },
        { text: "Money you add to your Wallet yourself is also credit for use on Learniee and is not refundable to your bank. If you added money by mistake or were charged twice, send a refund request." },
        { text: "Referral rewards are Wallet credit only. They have no cash value. If the Enrollment that earned a reward is fully refunded, we may reverse the reward." },
      ],
    },
    {
      id: "how-to-claim",
      title: "How to Ask for a Refund",
      clauses: [
        { text: "Open **Payments** in your Parent account, choose **Request refund** next to the payment, and tell us why. You can withdraw a request any time before the admin decides." },
        { text: "Ask within 7 days of the payment for refunds before approval, before the first class and for payment problems. For classes not delivered, ask within 7 days after the Cycle closes, because we can only tell then whether a make-up was possible. We will still look at later requests where the delay was not your fault." },
        { text: `If you cannot use the Payments page, write to ${LEGAL_CONTACT.email} or message us on WhatsApp at ${LEGAL_CONTACT.whatsapp} with your registered e-mail or phone number, the Learner's name, the course and your payment ID or invoice number. We will raise the request for you.` },
        { text: "An admin reviews every request. The admin may approve the full amount, approve a smaller amount, or decline, and you will see the decision and any note next to the payment and in a notification. We aim to decide within 3 working days." },
      ],
    },
    {
      id: "how-refunded",
      title: "How and When You Are Refunded",
      clauses: [
        { text: "When the admin approves, the amount is added to your Wallet straight away. It is not sent to your bank account, card or UPI, and there is no cash-out." },
        { text: "The refund can never be more than you paid for that payment, minus any refund already approved for it." },
        { text: "If the admin declines, no money moves. You will be told why, and you can write to us if you think we got it wrong." },
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
