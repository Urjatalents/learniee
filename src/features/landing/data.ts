export interface CourseCard {
  title: string;
  symbol: string;
  bg: string;
  meta: string;
  rate: string;
}

export const COURSE_TABS: Record<string, CourseCard[]> = {
  "1-to-1 tutoring": [
    { title: "Maths, Grade 5–7", symbol: "M", bg: "#DCD1FF", meta: "1-to-1", rate: "₹499" },
    { title: "English Speaking", symbol: "E", bg: "#FFD25E", meta: "1-to-1", rate: "₹449" },
    { title: "Science, Grade 8–10", symbol: "S", bg: "#B7A3F5", meta: "1-to-1", rate: "₹549" },
    { title: "Hindi Grammar", symbol: "अ", bg: "#ECE6FF", meta: "1-to-1", rate: "₹399" },
  ],
  "Extra academics": [
    { title: "Abacus for Beginners", symbol: "∑", bg: "#FFD25E", meta: "Group · 7 yrs+", rate: "₹299" },
    { title: "Vedic Maths", symbol: "√", bg: "#DCD1FF", meta: "Group · 9 yrs+", rate: "₹299" },
    { title: "Phonics, Level 1", symbol: "Ph", bg: "#B7A3F5", meta: "Group · 3–6 yrs", rate: "₹249" },
    { title: "Logical Reasoning", symbol: "?", bg: "#ECE6FF", meta: "Group · 9 yrs+", rate: "₹299" },
  ],
  Hobby: [
    { title: "Doodle Art", symbol: "✎", bg: "#B7A3F5", meta: "Group · 7 yrs+", rate: "₹349" },
    { title: "Learn Mandarin, Beginner", symbol: "汉", bg: "#FFD25E", meta: "Group · 9 yrs+", rate: "₹1,299" },
    { title: "Keyboard for Kids", symbol: "♪", bg: "#DCD1FF", meta: "1-to-1 · 6 yrs+", rate: "₹499" },
    { title: "Coding with Python", symbol: "</>", bg: "#ECE6FF", meta: "Group · 10 yrs+", rate: "₹399" },
  ],
  "Competitive exams": [
    { title: "IIT Preparation Crash Course", symbol: "IIT", bg: "#DCD1FF", meta: "Group · 16 yrs+", rate: "₹699" },
    { title: "NEET Biology", symbol: "Bio", bg: "#FFD25E", meta: "Group · 16 yrs+", rate: "₹649" },
    { title: "Olympiad Maths", symbol: "Ol", bg: "#B7A3F5", meta: "Group · 10 yrs+", rate: "₹399" },
    { title: "GRE Verbal", symbol: "GRE", bg: "#ECE6FF", meta: "1-to-1 · 18 yrs+", rate: "₹799" },
  ],
};

export interface FooterLink {
  label: string;
  href: string;
}
export interface FooterColumn {
  title: string;
  links: FooterLink[];
}
export interface FooterGroup {
  label: string;
  columns: FooterColumn[];
}

// NOTE: most of these pages are not built yet (public marketing site is a
// later phase) — until then they 404. Only /login and /signup exist.
export const FOOTER_GROUPS: FooterGroup[] = [
  {
    label: "Company and support",
    columns: [
      {
        title: "About",
        links: [
          { label: "About us", href: "/about" },
          { label: "Careers", href: "/careers" },
          { label: "Blog", href: "/blog" },
          { label: "Press", href: "/press" },
          { label: "Partnerships", href: "/partners" },
          { label: "Contact us", href: "/contact" },
        ],
      },
      {
        title: "Learn",
        links: [
          { label: "Browse classes", href: "/courses" },
          { label: "1-to-1 tutoring", href: "/courses/1-to-1-tutoring" },
          { label: "Group classes", href: "/courses/group-classes" },
          { label: "Book a free demo", href: "/signup" },
          { label: "Give a gift card", href: "/gift" },
          { label: "Referral programme", href: "/referral" },
        ],
      },
      {
        title: "Teach",
        links: [
          { label: "Become a mentor", href: "/signup?role=teacher" },
          { label: "Why teach on Learniee", href: "/teach" },
          { label: "How to join", href: "/teach#join" },
          { label: "Teacher guidelines", href: "/teach/guidelines" },
        ],
      },
      {
        title: "Support",
        links: [
          { label: "Help centre", href: "/help" },
          { label: "FAQ", href: "/#faq" },
          { label: "Refund policy", href: "/refunds" },
          { label: "Security policy", href: "/security" },
          { label: "Cookie policy", href: "/cookies" },
          { label: "Privacy policy", href: "/privacy" },
          { label: "Terms of use", href: "/terms" },
        ],
      },
    ],
  },
  {
    label: "Browse classes",
    columns: [
      {
        title: "Subjects",
        links: [
          { label: "Maths", href: "/courses/maths" },
          { label: "Science", href: "/courses/science" },
          { label: "English", href: "/courses/english" },
          { label: "Hindi", href: "/courses/hindi" },
          { label: "Social Studies", href: "/courses/social-studies" },
          { label: "History", href: "/courses/history" },
          { label: "Coding", href: "/courses/coding" },
          { label: "Vedic Maths", href: "/courses/vedic-maths" },
          { label: "Abacus", href: "/courses/abacus" },
          { label: "Phonics", href: "/courses/phonics" },
          { label: "Art", href: "/courses/art" },
          { label: "Music", href: "/courses/music" },
          { label: "Dance", href: "/courses/dance" },
          { label: "Photography", href: "/courses/photography" },
          { label: "Public Speaking", href: "/courses/public-speaking" },
          { label: "Personality Development", href: "/courses/personality-development" },
        ],
      },
      {
        title: "Classes by age",
        links: [
          { label: "3 Year Olds", href: "/courses/age/3-year-olds" },
          { label: "4 Year Olds", href: "/courses/age/4-year-olds" },
          { label: "5 Year Olds", href: "/courses/age/5-year-olds" },
          { label: "6 Year Olds", href: "/courses/age/6-year-olds" },
          { label: "7 Year Olds", href: "/courses/age/7-year-olds" },
          { label: "8 Year Olds", href: "/courses/age/8-year-olds" },
          { label: "9 Year Olds", href: "/courses/age/9-year-olds" },
          { label: "10 Year Olds", href: "/courses/age/10-year-olds" },
          { label: "11 Year Olds", href: "/courses/age/11-year-olds" },
          { label: "12 Year Olds", href: "/courses/age/12-year-olds" },
          { label: "13 Year Olds", href: "/courses/age/13-year-olds" },
          { label: "14 Year Olds", href: "/courses/age/14-year-olds" },
          { label: "15 Year Olds", href: "/courses/age/15-year-olds" },
          { label: "16 Year Olds", href: "/courses/age/16-year-olds" },
          { label: "17 Year Olds", href: "/courses/age/17-year-olds" },
          { label: "18 Year Olds", href: "/courses/age/18-year-olds" },
        ],
      },
      {
        title: "Classes by grade",
        links: [
          { label: "Prep", href: "/courses/grade/prep" },
          { label: "1st Grade", href: "/courses/grade/1st-grade" },
          { label: "2nd Grade", href: "/courses/grade/2nd-grade" },
          { label: "3rd Grade", href: "/courses/grade/3rd-grade" },
          { label: "4th Grade", href: "/courses/grade/4th-grade" },
          { label: "5th Grade", href: "/courses/grade/5th-grade" },
          { label: "6th Grade", href: "/courses/grade/6th-grade" },
          { label: "7th Grade", href: "/courses/grade/7th-grade" },
          { label: "8th Grade", href: "/courses/grade/8th-grade" },
          { label: "9th Grade", href: "/courses/grade/9th-grade" },
          { label: "10th Grade", href: "/courses/grade/10th-grade" },
          { label: "11th Grade", href: "/courses/grade/11th-grade" },
          { label: "12th Grade", href: "/courses/grade/12th-grade" },
        ],
      },
      {
        title: "More to explore",
        links: [
          { label: "Python", href: "/courses/python" },
          { label: "Robotics", href: "/courses/robotics" },
          { label: "Graphic Design", href: "/courses/graphic-design" },
          { label: "Artificial Intelligence", href: "/courses/artificial-intelligence" },
          { label: "Game Development", href: "/courses/game-development" },
          { label: "Digital Marketing", href: "/courses/digital-marketing" },
          { label: "Life Skills", href: "/courses/life-skills" },
          { label: "Logical Reasoning", href: "/courses/logical-reasoning" },
          { label: "General Knowledge", href: "/courses/general-knowledge" },
          { label: "Olympiads", href: "/courses/olympiads" },
          { label: "JEE", href: "/courses/jee" },
          { label: "NEET", href: "/courses/neet" },
          { label: "GRE", href: "/courses/gre" },
          { label: "GMAT", href: "/courses/gmat" },
        ],
      },
    ],
  },
  {
    label: "Boards, languages and counselling",
    columns: [
      {
        title: "Boards",
        links: [
          { label: "CBSE", href: "/courses/board/cbse" },
          { label: "ICSE", href: "/courses/board/icse" },
          { label: "IGCSE", href: "/courses/board/igcse" },
          { label: "IB", href: "/courses/board/ib" },
          { label: "State Boards", href: "/courses/board/state-boards" },
        ],
      },
      {
        title: "Languages",
        links: [
          { label: "English", href: "/courses/language/english" },
          { label: "Hindi", href: "/courses/language/hindi" },
          { label: "Marathi", href: "/courses/language/marathi" },
          { label: "French", href: "/courses/language/french" },
          { label: "Spanish", href: "/courses/language/spanish" },
          { label: "Mandarin", href: "/courses/language/mandarin" },
        ],
      },
      {
        title: "Counselling",
        links: [
          { label: "Career", href: "/counselling/career" },
          { label: "Behavioural", href: "/counselling/behavioural" },
          { label: "School", href: "/counselling/school" },
          { label: "Examinations", href: "/counselling/examinations" },
        ],
      },
    ],
  },
];
