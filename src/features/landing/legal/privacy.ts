import { LEGAL_CONTACT, LEGAL_LAST_UPDATED } from "./contact";
import type { LegalDocument } from "./types";

export const PRIVACY: LegalDocument = {
  title: "Privacy Policy",
  subtitle: "What we collect, why we collect it, who sees it and the choices you have.",
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      id: "who-we-are",
      title: "Who We Are",
      clauses: [
        { text: "Learniee is an online education platform run by Urja Talents (\"Learniee\", \"we\", \"us\"). It connects Learners with independent Educators for live online classes." },
        { text: "This policy explains how we handle personal information on the Learniee website and app (the \"Platform\"). It should be read with our [[Terms & Conditions|/terms]] and [[Refund Policy|/refunds]]." },
        { text: "We handle personal information in line with the laws of India that apply to us, including the Information Technology Act, 2000 and the rules under it, and the Digital Personal Data Protection Act, 2023 as it comes into force." },
        { text: "By creating an account or using the Platform you agree to this policy. Where a Learner is under 18, the Parent gives this agreement on the Learner's behalf." },
      ],
    },
    {
      id: "definitions",
      title: "Definitions",
      clauses: [
        { lead: "Personal information", text: "means information that can identify a person. It does not include information that has been anonymised." },
        { lead: "Parent", text: "means a Learner's parent or legal guardian and the account holder. **Learner** means the child or other person taking classes. **Educator** means an independent teacher offering classes on the Platform." },
        { lead: "Child", text: "means anyone under 18." },
      ],
    },
    {
      id: "collection",
      title: "Information We Collect",
      clauses: [
        { lead: "Parents.", text: "When you sign up and complete onboarding we collect:", bullets: [
          "Name, e-mail address, phone and WhatsApp number.",
          "Address, city, country, PIN code, nationality, whether you are resident in India or abroad, and time zone and currency.",
          "Your relationship to the Learner, your preferred language, your child's interests and subjects, and how you heard about us.",
          "The referral code you used, if any, and your own referral code.",
        ] },
        { lead: "Learners.", text: "The Parent adds each Learner's details:", bullets: [
          "Name, gender, age or date of birth, school standard and board.",
          "Optional details: current school name, any learning difficulties the Parent chooses to tell us about so the Educator can help, and a photo.",
        ] },
        { lead: "Educators.", text: "When applying we collect:", bullets: [
          "Name, e-mail, phone, date of birth, gender, nationality and address.",
          "Qualifications, teaching experience, languages, equipment, and links to social-media profiles if provided.",
          "PAN, identity, address, date-of-birth and qualification proofs, an introduction video, a photo and, optionally, certificates and awards.",
          "A self-declaration about any criminal case, used in our checks because Educators work with minors.",
          "Bank account details, so we can pay the Educator.",
        ] },
        { lead: "Activity on the Platform.", text: "We keep records of:", bullets: [
          "Bookings, Enrollments, schedules, class start, join and end times, class outcomes and reports, make-ups, reschedule and leave requests.",
          "Homework, submissions and feedback, class summaries, reviews, complaints and certificates.",
          "Chat messages between Parent and Educator.",
          "Wallet entries, referrals, notifications, and a log of important account and administrative actions.",
        ] },
        { lead: "Payments.", text: "Payments go through Razorpay. We receive and store the order and payment IDs, the amount, the date and whether the payment succeeded, and we issue invoices. We do not receive or store your full card number, CVV or UPI PIN." },
        { lead: "Recordings.", text: "Classes may be recorded in audio, video or written form, as explained in the [[Terms|/terms#recording]]. A recording can contain images and voices of Children and Educators." },
        { lead: "Technical data.", text: "When you use the site we receive your IP address, browser and device type, and the pages you visit. See Cookies below." },
      ],
    },
    {
      id: "children",
      title: "Children's Privacy",
      clauses: [
        { text: "Only a Parent can create an account. A Child uses the Platform through the Parent's account and under the Parent's supervision, and we collect a Child's information only from the Parent." },
        { text: "By adding a Learner you confirm that you are their parent or legal guardian and consent to us processing the Learner's information as described here." },
        { text: "We do not use a Child's information for behavioural tracking or targeted advertising aimed at children." },
        { text: "Details about learning difficulties are optional. They are shown only to the people who need them to teach the Learner well and to Learniee staff." },
        { text: "If we learn that we hold a Child's information without a Parent's consent, we will delete it. Parents can ask to see, correct or delete their Child's information at any time (see Your Rights)." },
        { text: "We will not put a Child's full name, school, home address or other identifying details in public marketing material." },
        { text: "If we change how we collect, use or share a Child's information, we will notify Parents and obtain their consent first." },
      ],
    },
    {
      id: "use",
      title: "How We Use Information",
      clauses: [
        { text: "We use personal information to:", bullets: [
          "Create and secure your account, and send sign-in codes.",
          "Match Learners with Educators, book demos and Enrollments, take payments, issue invoices and run renewals.",
          "Run classes, record attendance, decide class outcomes, arrange make-ups and handle reports and disputes.",
          "Show progress, homework, summaries and certificates to Parents and Educators.",
          "Approve Educators, check their credentials, and pay them.",
          "Keep the Platform safe: review chats and recordings where needed, investigate complaints, prevent fraud and misuse.",
          "Send service messages such as booking confirmations, class reminders, payment-due reminders, renewal notices and payout updates.",
          "Run the referral programme and credit rewards and refunds to the Wallet.",
          "Improve the Platform through analysis of usage.",
          "Meet legal, tax and accounting obligations.",
        ] },
        { text: "We use personal information only for the purposes it was collected for, or for a closely related purpose." },
        { lead: "Marketing.", text: "We may send you news, offers and tips by e-mail, WhatsApp or SMS. You can opt out at any time by telling us. You cannot opt out of essential service messages about your account, payments and classes." },
        { lead: "Aggregate data.", text: "We may combine information in a way that no longer identifies anyone and use it for research and to improve the service." },
      ],
    },
    {
      id: "sharing",
      title: "Who We Share Information With",
      clauses: [
        { text: "We do not sell personal information." },
        { lead: "Educators and Parents.", text: "An Educator sees the Learner details, schedule, chat and homework for the Enrollments they teach. A Parent sees the Educator's profile, course and class information. Reports a Parent makes about a class are seen only by Learniee." },
        { lead: "Service providers.", text: "We use trusted providers to run the Platform and they may process information for us only as needed to do so:", bullets: [
          "Amazon Web Services: sign-in (Cognito), our database, file storage for uploads and e-mail delivery.",
          "Razorpay: payment processing and, once enabled, Educator payouts.",
          "An SMS provider (Fast2SMS) to send one-time passwords.",
          "Our hosting provider (Vercel) and, when live video is enabled, our video-conferencing provider.",
        ] },
        { lead: "Legal reasons.", text: "We may disclose information if the law requires it, to respond to legal process, to enforce our Terms, or to protect the rights, property or safety of Learniee, our users or the public." },
        { lead: "Business changes.", text: "If Learniee is merged with or acquired by another business, or sells its assets, personal information may be transferred to the new owner, and we will tell you." },
        { lead: "With your consent.", text: "We may share information for any other purpose you agree to." },
      ],
    },
    {
      id: "security",
      title: "Security",
      clauses: [
        { text: "We use reasonable technical and organisational measures to protect personal information against loss, misuse and unauthorised access or disclosure." },
        { text: "Information is sent over encrypted connections. Sign-in is handled by AWS Cognito. Files such as identity documents, videos and homework are kept in private storage and opened only through short-lived links." },
        { text: "Access to personal information is limited to Learniee staff and providers who need it for their work and who are bound by confidentiality. Different staff roles (for example Admin, Accounts and HR) see only the parts they need." },
        { text: "No system is perfectly secure. If a breach affects your personal information, we will notify the affected users and the authorities as the law requires, and act to limit the harm." },
      ],
    },
    {
      id: "retention",
      title: "How Long We Keep Information",
      clauses: [
        { text: "We keep personal information for as long as needed for the purposes in this policy, and longer where the law requires it or where it is needed to handle a legal claim, dispute or fraud." },
        { text: "Payment records, invoices and payout records are kept for as long as tax and accounting laws require, even if you close your account." },
        { text: "Chat messages, class records and homework are kept while the Enrollment is active and afterwards for as long as we need them to resolve disputes and for quality and safety." },
        { text: "When information is no longer needed, we delete it or anonymise it. Anonymised information may be kept indefinitely." },
      ],
    },
    {
      id: "rights",
      title: "Your Rights",
      clauses: [
        { text: "You can ask us to:", bullets: [
          "Give you a copy of the personal information we hold about you or your Learner.",
          "Correct information that is wrong or incomplete. Many details can be edited yourself in Profile.",
          "Delete your account and information, subject to what we must keep by law.",
          "Stop using your information for marketing, or withdraw a consent you gave.",
        ] },
        { text: `Write to ${LEGAL_CONTACT.email}. We will reply and act on a verifiable request within 30 days. We may refuse requests that are excessive, that would affect other people's privacy, or that relate to legal proceedings.` },
        { text: "Withdrawing consent or deleting your account may mean we can no longer provide classes to you." },
        { lead: "Notifications.", text: "You can switch in-app notifications off in Settings. Some essential messages about payments and your account may still be sent." },
        { lead: "Grievances.", text: `If you have a concern about how your information is handled, write to our grievance contact at ${LEGAL_CONTACT.email}. We will respond to complaints promptly and aim to resolve them within 30 days.` },
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      clauses: [
        { text: "Cookies are small files stored on your device. We use:", bullets: [
          "**Essential cookies** that keep you signed in and secure. Without them you cannot use your account. Our sign-in cookie lasts up to one day.",
          "**Preference and analytics cookies** to remember choices and to understand how the site is used, only if and when we switch them on. Analytics data is aggregated.",
        ] },
        { text: "We do not use cookies to show advertising to Children." },
        { text: "You can block or delete non-essential cookies in your browser settings, but parts of the site may then not work." },
        { text: "Third-party services, such as our payment provider, may set their own cookies. This policy does not cover those." },
      ],
    },
    {
      id: "links",
      title: "Links to Other Sites",
      clauses: [
        { text: "The Platform may link to websites we do not own or control. We are not responsible for their content or privacy practices, and you use them at your own risk." },
      ],
    },
    {
      id: "changes",
      title: "Changes to This Policy",
      clauses: [
        { text: "We may update this policy from time to time. We will give notice of material changes on the Platform for at least 30 days, and for changes that affect Children's information we will ask Parents for consent first." },
        { text: "The updated policy takes effect when posted. If you keep using the Platform after that date, you accept it." },
      ],
    },
    {
      id: "law",
      title: "Governing Law",
      clauses: [
        { text: "This policy is governed by Indian law and the courts in Mumbai have exclusive jurisdiction. Disputes are first discussed in good faith, and if not resolved within 30 days go to arbitration in Mumbai under the Arbitration and Conciliation Act, 1996, in English." },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      clauses: [
        { text: `Privacy questions: ${LEGAL_CONTACT.email}, or WhatsApp ${LEGAL_CONTACT.whatsapp}. ${LEGAL_CONTACT.entity}, ${LEGAL_CONTACT.location}.` },
      ],
    },
  ],
};
