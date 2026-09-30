import { LEGAL_CONTACT, LEGAL_LAST_UPDATED } from "./contact";
import type { LegalDocument } from "./types";

export const TERMS: LegalDocument = {
  title: "Terms & Conditions",
  subtitle: "The terms that govern your use of the Learniee platform.",
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      clauses: [
        {
          text: "These Terms & Conditions (\"Terms\") govern the Learniee website and app, and everything on them: courses, classes, chat, homework and other content (the \"Platform\"). The Platform is run by Learniee, a product of Urja Talents (\"Learniee\", \"we\", \"us\").",
        },
        {
          text: "If you register an account, book a demo, enroll in a class or use the Platform in any other way, you agree to these Terms. If you do not agree, please do not use the Platform.",
        },
        {
          text: "If the Learner is a minor, these Terms are entered into by, and bind, the minor's parent or legal guardian, who is responsible for the minor's use of the Platform.",
        },
        {
          text: "Please read these Terms together with our [[Privacy Policy|/privacy]] and [[Refund Policy|/refunds]]. Both form part of this agreement.",
        },
      ],
    },
    {
      id: "definitions",
      title: "Definitions",
      clauses: [
        { lead: "Services", text: "means the online education marketplace offered through the Platform: live classes, homework, chat, resources and related features." },
        { lead: "Learner / Student", text: "means anyone taking a Class, including a minor enrolled by a Parent." },
        { lead: "Parent", text: "means the parent or legal guardian of a Learner who is a minor, and the person who holds the account and pays." },
        { lead: "Educator / Teacher", text: "means an individual engaged through Learniee to deliver Classes." },
        { lead: "Class / Session", text: "means any live, one-to-one or group lesson run through the Platform, including demo classes." },
        { lead: "Cycle", text: "means one monthly billing period of an Enrollment, from its start date to the day before the same date in the next month." },
        { lead: "Enrollment", text: "means a Parent's booking of a course for a Learner, with a chosen weekly schedule, for one or more Cycles." },
        { lead: "Wallet", text: "means the Learniee credit balance held in a Parent's account." },
        { lead: "Content", text: "means everything created on the Platform: chat messages, homework and submissions, class summaries, reviews, and any recordings or transcripts." },
      ],
    },
    {
      id: "eligibility",
      title: "Eligibility & Accounts",
      clauses: [
        { text: "You must be at least 18 to create an account. Minors can use the Platform only through a Parent's account, under the Parent's supervision." },
        { text: "Give accurate, current information when you register and keep it up to date. This includes the Learner's age and grade, which affect class placement." },
        { text: "You sign in with a one-time password (OTP) sent to your registered e-mail or phone. Keep your login details private. You are responsible for everything that happens under your account." },
        { text: "We may suspend or close an account that has false information, breaks these Terms, or harms other users or the Platform." },
      ],
    },
    {
      id: "services",
      title: "Nature of Services",
      clauses: [
        { text: "Learniee connects Learners with independent Educators for online classes in school subjects, competitive exams and extracurricular areas." },
        { text: "We do not guarantee any particular grade or exam result. Classes are delivered on a reasonable-effort basis." },
        { text: "Schedules, formats and Educator assignments may change from time to time. Where a change affects a paid Enrollment, we will tell you through the Platform." },
        { lead: "Video classes.", text: "Classes are held online. The Platform records when the Educator starts, when the Learner joins and when the Educator ends a class, and uses those times to decide the class outcome (see Section 7)." },
      ],
    },
    {
      id: "demos",
      title: "Demo Classes & Coupons",
      clauses: [
        { text: "Every Parent account gets two free demo classes. After that, a demo class costs ₹100 (plus any surcharge described in Section 11). Extra demo coupons can be bought in bulk, from 1 to 20 at a time." },
        { text: "A coupon is used when a demo is booked. A demo is not an Enrollment; no fee is due for the course until you enroll." },
        { text: "Coupons belong to the account that bought them, are not transferable and have no cash value. Refunds for demo payments are covered in the [[Refund Policy|/refunds]]." },
      ],
    },
    {
      id: "enrollment",
      title: "Enrollment, Approval & Monthly Cycles",
      clauses: [
        { lead: "How a booking works.", text: "You choose a course, the weekdays and time for classes, and a start date. The number of classes in the Cycle is the number of your chosen weekdays that fall between the start date and the end of the Cycle (at least 4). The fee is the Educator's per-class rate multiplied by that number. The price is shown before you pay and stays fixed for that Cycle." },
        { lead: "Payment first.", text: "You pay for the Cycle when you book. Your Enrollment is then reviewed by the Educator and by Learniee. It becomes active only when both approve." },
        { lead: "Changes before approval.", text: "The Educator may propose a different start date or schedule. If the fee changes as a result, you will see the new fee. If the start date has already passed when approval is due, the Enrollment cannot be approved until it is revised." },
        { lead: "If an Enrollment is rejected,", text: "the amount you paid is refunded as set out in the [[Refund Policy|/refunds]]." },
        { lead: "Sessions.", text: "When an Enrollment is approved, all the class sessions for the Cycle are created at once on the days and times you chose. The schedule cannot be edited in the middle of a Cycle; use the reschedule option for individual classes (Section 7)." },
        { lead: "Renewal.", text: "You renew one Cycle at a time. Renewal opens 7 days before the current Cycle ends. The next Cycle starts the day after the previous one ends, and you may change the weekdays and time for it. The per-class rate stays the rate agreed at your original Enrollment. Renewal needs no fresh approval." },
        { lead: "If you do not renew,", text: "the Enrollment ends when the Cycle closes and is marked completed. To continue with the same Educator afterwards you need to make a new Enrollment." },
        { lead: "Inactivity.", text: "An Enrollment made before September 2026 (on the older sessions-per-month model) may lapse if no class has been completed for 45 days." },
      ],
    },
    {
      id: "classes",
      title: "Classes, Attendance & Disputes",
      clauses: [
        { lead: "Starting a class.", text: "The Educator can start a class from 10 minutes before its scheduled time. The Learner can join from 10 minutes before the start until the scheduled end." },
        { lead: "How the outcome is decided.", text: "After a class the Platform records the result from the start, join and end times:", bullets: [
          "Both joined and were present together for at least 50% of the class: the class is **completed** and counts.",
          "The Educator started but the Learner never joined: **student absent**. The class counts and is paid for.",
          "The Learner joined but the Educator never started: **teacher absent**. The class does not count and a make-up class is arranged.",
          "Nobody joined: the class is cancelled and a make-up class is arranged.",
          "Both joined but were together for less than 50% of the class: the class goes to Learniee for review.",
        ] },
        { lead: "Cancelling.", text: "A Parent who cancels at least 4 hours before the class starts is not treated as a late cancellation, but the class is not counted and no make-up class is given. To keep the class, reschedule it instead. A Parent who cancels less than 4 hours before the start makes a late cancellation: the class counts and is paid for. A class cannot be cancelled once anyone has started or joined it." },
        { lead: "Educator cancellations and absences.", text: "If an Educator cancels or does not attend, we arrange a make-up class at the next free slot on your regular weekday and time, at least 4 hours ahead and within the Cycle's 45-day window, avoiding the Educator's approved leave and other classes. Repeated Educator absences are recorded against the Educator." },
        { lead: "Educator leave.", text: "When an Educator's leave is approved, their classes that fall inside the leave and have not started are moved to the next free slots. If no slot fits, the class is cancelled and does not count." },
        { lead: "Rescheduling.", text: "Either side can propose a new time for a class, and the other side must accept. A proposal must be made at least 4 hours before the class and the new time must fall on or before the last day of the Cycle's 45-day window." },
        { lead: "Confirm or report.", text: "For 48 hours after a class outcome is final, the Parent can confirm it (\"All good\") or report a problem. Reports are seen only by Learniee, not by the Educator. If you do nothing within 48 hours, the outcome is accepted." },
        { lead: "Learniee's decision.", text: "Learniee reviews reported classes and classes needing review, and records its decision with a reason. It may later correct a decision. Its decision on the outcome of a class is final for the purposes of these Terms and the fees and payouts that depend on them." },
        { lead: "Uncounted classes.", text: "Classes that do not count in a Cycle (for example an unreplaced teacher-absent class) are dealt with in the [[Refund Policy|/refunds]]." },
      ],
    },
    {
      id: "parents",
      title: "Parent / Guardian Policy",
      clauses: [
        { lead: "Consent and responsibility.", text: "By enrolling a minor, the Parent confirms they are the lawful parent or guardian and accepts these Terms, the Privacy Policy and the Refund Policy on the Learner's behalf." },
        { lead: "Supervision.", text: "Parents are responsible for reasonably supervising minors during sessions, including conduct, device use and general online safety." },
        { lead: "Communication.", text: "We send scheduling, billing and progress updates mainly to the Parent's registered contact details (in-app notifications, e-mail, phone or WhatsApp) rather than to the minor." },
        { lead: "Progress information.", text: "Parents can see class history, teacher summaries, homework and attendance under My Classes, and can ask support for more." },
        { lead: "No recording or sharing.", text: "Parents agree not to record, redistribute or publicly share Educator-delivered class content without Learniee's written permission." },
        { lead: "Accurate details.", text: "Parents must state the Learner's age and grade correctly at enrollment." },
      ],
    },
    {
      id: "teachers",
      title: "Teacher / Educator Policy",
      clauses: [
        { lead: "Independent contractors.", text: "Educators work as independent contractors, not as employees, agents or partners of Learniee, unless a separate written agreement says otherwise." },
        { lead: "Application and approval.", text: "Educators apply with personal, qualification and identity details, an introduction video and supporting documents. Learniee reviews each application and can approve, reject or later change a decision. Educators may take classes only once approved." },
        { lead: "Courses.", text: "Courses are submitted by the Educator and go live only after Learniee approves them. The per-class price is set by the Educator." },
        { lead: "Conduct.", text: "Educators must run classes professionally and on time, in a way that suits an audience that includes minors, and follow Learniee's child-safety code of conduct." },
        { lead: "Running classes.", text: "Educators must start each class on time and end it using the Platform, because the recorded times decide whether a class counts and is paid. Educators may add a short summary after each class, which the Parent can see." },
        { lead: "Cancellations, absences and strikes.", text: "Educators must give reasonable advance notice before cancelling or rescheduling. A class the Educator cancels or misses is recorded as a strike. Learniee may act on repeated strikes, including suspending or ending the engagement." },
        { lead: "Leave.", text: "Educators request leave through the Platform. Approved leave moves or cancels the affected classes as described in Section 7." },
        { lead: "Payment.", text: "Educators are paid according to the rate and schedule agreed at onboarding. A payout is prepared only after a Cycle has closed and every class in it has been accepted by the Parent, has passed the 48-hour window, or has been decided by Learniee. Payouts are made to a bank account the Educator has submitted and Learniee has approved. Any platform fee or deduction is set out in the Educator's onboarding agreement." },
        { lead: "Certificates.", text: "Where a course offers a completion certificate, the Educator decides whether to issue one once the Learner has reached the course's class threshold. That decision is final." },
        { lead: "Content ownership.", text: "Original teaching materials remain the Educator's own. Learniee holds the rights in recordings described in Section 10." },
        { lead: "Verification.", text: "Learniee may check an Educator's credentials and background before and during their time on the Platform, because our audience includes minors. Educators must answer verification questions truthfully." },
        { lead: "Non-circumvention.", text: "Educators must not encourage Learners to continue classes outside the Platform in order to avoid Learniee's fees, during the engagement and for a reasonable period after it, as set out in the onboarding agreement." },
        { lead: "Termination.", text: "Learniee may end an Educator's engagement for breach of these Terms, conduct concerns or performance issues, with notice as set out in the onboarding agreement." },
      ],
    },
    {
      id: "recording",
      title: "Session Recording & Marketing Use",
      clauses: [
        { lead: "Recording.", text: "Classes, whether one-to-one or group, may be recorded in audio, video or written (chat or transcript) form. We use recordings for quality assurance, resolving disputes, training and improving the service." },
        { lead: "Ownership.", text: "As between Learniee, the Educator and the user, Learniee owns the rights in recordings made through the Platform, including the right to store, edit, reproduce and use them, subject to the limits in this Section." },
        { lead: "Marketing use.", text: "Learniee may use clips or full recordings, including a Learner's or Educator's likeness, voice or first name, in promotional material: our website, social media, ads and sales content." },
        { lead: "Consent by enrollment.", text: "By enrolling in or attending a class, Learners, Educators and Parents (on behalf of minors) agree to the recording and marketing use described here." },
        { lead: "Opt-out.", text: "If you would rather your recordings were not used for marketing, tell us in writing before enrollment or at any time afterwards. We will make reasonable efforts to leave you out of future marketing, but cannot undo anything already published." },
        { lead: "No extra payment.", text: "Using a recording under this Section does not entitle Learners, Parents or Educators to any payment beyond what is agreed under these Terms." },
        { lead: "Protecting minors.", text: "We take reasonable care not to include a minor's full name, school, home address or other identifying details, beyond a first name or initials, in public marketing." },
      ],
    },
    {
      id: "fees",
      title: "Fees & Payments",
      clauses: [
        { text: "Fees are shown in Indian rupees (INR) on the Platform before you pay, and are payable in advance for each Cycle, demo or coupon purchase." },
        { text: "Payments are processed by our third-party payment processor, Razorpay. Learniee does not see or store your full card details. We are not responsible for delays or errors on the processor's or your bank's side." },
        { lead: "International payments.", text: "If you pay from outside India, or use an international card, a payment surcharge (currently 3% by default) may be added and is shown at checkout before you pay." },
        { text: "We issue an invoice for every successful payment, available under Payments in your account. Taxes, where applicable, are shown on the invoice." },
        { text: "We may change fees for future Enrollments, renewals and coupons. A Cycle you have already paid for is not affected. A renewal uses the per-class rate agreed at your original Enrollment." },
        { text: "If money is taken but the booking cannot be completed, for example because the fee changed while you were paying, contact support with your payment ID. See the [[Refund Policy|/refunds]]." },
        { text: "Refunds and cancellations are covered by our [[Refund Policy|/refunds]]." },
      ],
    },
    {
      id: "wallet",
      title: "Wallet",
      clauses: [
        { text: "Your Wallet holds credit. You can add money with an online payment, and Learniee may add credit for refunds, adjustments and referral rewards." },
        { text: "Wallet credit is for use on Learniee only. It has no cash value, cannot be withdrawn or transferred, and is not a bank account or a prepaid payment instrument." },
        { text: "Every credit to your Wallet is listed in your account. If you think an entry is wrong, contact support." },
      ],
    },
    {
      id: "referral",
      title: "Refer & Earn",
      clauses: [
        { text: "Each Parent account gets a personal referral code. When a person you refer enters your code while signing up and then successfully enrolls in and pays for a course, ₹500 is credited to your Wallet. The reward is paid once per person you refer, on that person's first paid Enrollment, and never for signing up alone." },
        { text: "There is no limit on the number of people you can refer. The person you refer receives no reward for using a code." },
        { text: "You may not refer yourself or create accounts to earn rewards. We may withhold or reverse a reward, and close accounts, where we find misuse, or where the enrollment that earned the reward is fully refunded." },
        { text: "We may change or end the programme at any time; rewards already credited are not affected. See [[Refer & Earn|/referral]] for how it works." },
      ],
    },
    {
      id: "conduct",
      title: "Chat, Homework & Code of Conduct",
      clauses: [
        { lead: "Chat.", text: "Each Enrollment has a chat between the Parent and the Educator. Chat is for scheduling, homework and learning matters only. Learniee staff can view chats to keep users safe, resolve disputes and check quality." },
        { lead: "Keep it on the Platform.", text: "Do not use chat or classes to share phone numbers, social-media handles or other contact details, or to arrange payments or classes outside the Platform." },
        { lead: "Homework.", text: "Homework assigned by an Educator, and the Learner's submissions and the Educator's feedback, are visible to the Parent and the Educator." },
        { text: "Do not harass, abuse or discriminate against other users, Educators or Learniee staff, and do not post unlawful, harmful or inappropriate content." },
        { text: "Do not share login details, try to access the Platform by unauthorised means, or record and redistribute class content without permission." },
        { text: "We may suspend or close accounts for breaking this Code of Conduct, with or without notice depending on how serious it is." },
      ],
    },
    {
      id: "reviews",
      title: "Reviews, Certificates & Complaints",
      clauses: [
        { lead: "Reviews.", text: "A Parent with an active Enrollment can leave one rating and comment for a course. Reviews must be honest, fair and free of abuse, and we may remove reviews that are not. By posting a review you allow us to display it on the Platform." },
        { lead: "Certificates.", text: "Certificates are issued only by the Educator after the Learner reaches the course's class threshold, and only issued certificates are shown to the Parent. A certificate confirms attendance in the course; it is not an accredited qualification." },
        { lead: "Complaints.", text: "Parents and Educators can raise a complaint from their account. Learniee reviews each one and responds through the Platform." },
      ],
    },
    {
      id: "ip",
      title: "Intellectual Property",
      clauses: [
        { text: "The Platform, its website, logo, branding, course structure and compiled materials belong to Learniee and are protected by applicable intellectual-property law." },
        { text: "Users get a limited, non-transferable licence to access class content for personal educational use. Copying, reselling or publicly redistributing Platform content is not allowed without our written consent." },
      ],
    },
    {
      id: "liability",
      title: "Limitation of Liability",
      clauses: [
        { text: "The Platform is provided \"as is\" and \"as available\". We do not promise uninterrupted or error-free service, and classes may be affected by internet, device or third-party service problems." },
        { text: "To the extent the law allows, Learniee's liability for any claim arising from use of the Platform is limited to the fees you paid for the specific Cycle or class the claim relates to." },
        { text: "We are not liable for indirect or consequential loss, including lost data, lost academic opportunity or emotional distress, arising from use of the Platform." },
        { text: "Educators are independent contractors. Learniee is not responsible for an Educator's teaching content or statements beyond the checks described in these Terms." },
      ],
    },
    {
      id: "termination",
      title: "Termination",
      clauses: [
        { text: "You can close your account at any time by contacting support, subject to the [[Refund Policy|/refunds]] for any fees already paid." },
        { text: "We may suspend or end any account for breach of these Terms, non-payment, or conduct that puts other users, particularly minors, at risk." },
      ],
    },
    {
      id: "governing-law",
      title: "Governing Law & Disputes",
      clauses: [
        { text: "These Terms are governed by Indian law, and the courts in Mumbai have exclusive jurisdiction." },
        { text: "We will try first to resolve any dispute by good-faith discussion. If it is not resolved within 30 days, it will be referred to arbitration in Mumbai under the Arbitration and Conciliation Act, 1996, conducted in English." },
      ],
    },
    {
      id: "changes",
      title: "Changes to These Terms",
      clauses: [
        { text: "We may update these Terms from time to time. We will give notice of material changes on the Platform for at least 30 days." },
        { text: "If you keep using the Platform after a change takes effect, you accept the revised Terms." },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      clauses: [
        { text: `Questions about these Terms: ${LEGAL_CONTACT.email}, or WhatsApp ${LEGAL_CONTACT.whatsapp}. ${LEGAL_CONTACT.entity}, ${LEGAL_CONTACT.location}.` },
      ],
    },
  ],
};
