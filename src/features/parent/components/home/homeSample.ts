import type { HomeData, HomeSession } from "./homeTypes";

/** Sample data for the frontend-only phase. Replaced by real data in the backend step. */
export function buildHomeSample(now: Date): HomeData {
  const day0 = new Date(now);
  day0.setHours(0, 0, 0, 0);

  const at = (offsetDays: number, h: number, m: number) => {
    const d = new Date(day0);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const kids = [
    { id: "aarav", name: "Aarav Sharma", first: "Aarav", grade: 8, board: "CBSE" },
    { id: "anika", name: "Anika Sharma", first: "Anika", grade: 5, board: "ICSE" },
  ];

  const classes = [
    { id: "math", title: "Mathematics Mastery – Grade 8", subject: "Mathematics", teacherName: "Rohan Mehta", kidId: "aarav", status: "enrolled" as const, done: 9, total: 12, left: 11, price: 700 },
    { id: "eng", title: "English Grammar & Creative Writing", subject: "English", teacherName: "Sneha Kulkarni", kidId: "anika", status: "enrolled" as const, done: 6, total: 8, left: 9, price: 400 },
    { id: "chem", title: "Chemistry Foundations – Grade 9", subject: "Chemistry", teacherName: "Vikram Joshi", kidId: "aarav", status: "enrolled" as const, done: 3, total: 9, left: 22, price: 500 },
    { id: "phy", title: "Physics: Motion & Forces", subject: "Physics", teacherName: "Rohan Mehta", kidId: "aarav", status: "pending" as const, done: 0, total: 9, left: 0, price: 700 },
    { id: "alg", title: "Algebra Essentials – Grade 7", subject: "Mathematics", teacherName: "Rohan Mehta", kidId: "aarav", status: "completed" as const, done: 12, total: 12, left: 0, price: 600 },
  ];

  // Weekly slots (day offsets from today) per enrolled class.
  const slots: Record<string, { off: number[]; time: [number, number] }> = {
    math: { off: [0, 2, 4], time: [18, 0] },
    eng: { off: [1, 4], time: [17, 0] },
    chem: { off: [2, 6], time: [19, 30] },
  };

  let sid = 1;
  const sessions: HomeSession[] = [];
  for (const c of classes) {
    const slot = slots[c.id];
    if (!slot) continue;
    for (let w = -1; w <= 2; w++) {
      for (const o of slot.off) {
        const start = at(o + 7 * w, slot.time[0], slot.time[1]);
        sessions.push({
          id: `s${sid++}`,
          kind: "class",
          refId: c.id,
          title: c.title,
          subject: c.subject,
          teacherName: c.teacherName,
          kidId: c.kidId,
          start,
          hasLink: true,
          status: start < now ? "done" : "confirmed",
        });
      }
    }
  }

  const demos = [
    { id: "d1", title: "Physics: Motion & Forces", subject: "Physics", teacherName: "Rohan Mehta", kidId: "aarav", start: at(2, 16, 0) },
    { id: "d2", title: "Vedic Maths for Beginners", subject: "Mathematics", teacherName: "Neha Deshmukh", kidId: "anika", start: at(5, 17, 30) },
  ];
  for (const d of demos) {
    sessions.push({ id: `s${sid++}`, kind: "demo", refId: d.id, title: d.title, subject: d.subject, teacherName: d.teacherName, kidId: d.kidId, start: d.start, hasLink: true, status: "confirmed" });
  }

  const courses = [
    { id: "c1", title: "Mathematics Mastery – Grade 8", subject: "Mathematics", teacherId: "rohan", teacherName: "Rohan Mehta", rating: 4.9, price: 700, grades: [7, 9] as [number, number] },
    { id: "c2", title: "English Grammar & Creative Writing", subject: "English", teacherId: "sneha", teacherName: "Sneha Kulkarni", rating: 4.8, price: 400, grades: [3, 8] as [number, number] },
    { id: "c3", title: "Chemistry Foundations – Grade 9", subject: "Chemistry", teacherId: "vikram", teacherName: "Vikram Joshi", rating: 4.7, price: 500, grades: [8, 10] as [number, number] },
    { id: "c4", title: "Physics: Motion & Forces", subject: "Physics", teacherId: "rohan", teacherName: "Rohan Mehta", rating: 4.9, price: 700, grades: [7, 10] as [number, number] },
    { id: "c5", title: "Vedic Maths for Beginners", subject: "Mathematics", teacherId: "neha", teacherName: "Neha Deshmukh", rating: null, price: 400, grades: [3, 8] as [number, number] },
    { id: "c6", title: "Biology Made Easy – Grade 10", subject: "Biology", teacherId: "anita", teacherName: "Anita Rao", rating: 4.6, price: 500, grades: [9, 10] as [number, number] },
    { id: "c7", title: "Hindi Vyakaran & Lekhan", subject: "Hindi", teacherId: "meera", teacherName: "Meera Iyer", rating: 4.8, price: 400, grades: [3, 10] as [number, number] },
    { id: "c8", title: "Python for Kids", subject: "Computer Science", teacherId: "karan", teacherName: "Karan Malhotra", rating: 4.5, price: 400, grades: [4, 9] as [number, number] },
  ];

  return {
    firstName: "Priya",
    kids,
    classes,
    sessions,
    homework: [
      { kidId: "aarav", classId: "math", title: "Linear equations — Set 4", subject: "Mathematics", due: at(3, 0, 0) },
      { kidId: "anika", classId: "eng", title: "Write 150 words — prompt 2", subject: "English", due: at(2, 0, 0) },
      { kidId: "aarav", classId: "chem", title: "Balancing equations — practice", subject: "Chemistry", due: at(4, 0, 0) },
    ],
    courses,
    chats: [
      { id: "h1", classId: "math", teacherName: "Rohan Mehta", subject: "Mathematics", kidId: "aarav", last: "Oct 23" },
      { id: "h2", classId: "eng", teacherName: "Sneha Kulkarni", subject: "English", kidId: "anika", last: "Oct 22" },
      { id: "h3", classId: "chem", teacherName: "Vikram Joshi", subject: "Chemistry", kidId: "aarav", last: "Oct 20" },
    ],
    rescheduleAsks: [
      { id: "r1", classId: "chem", kidId: "aarav", teacherName: "Vikram Joshi", subject: "Chemistry" },
    ],
    walletBalance: 3000,
    freeDemos: 1,
    bookedDemoTitles: { aarav: ["Physics: Motion & Forces"], anika: ["Vedic Maths for Beginners"] },
    classTeacherId: { math: "rohan", eng: "sneha", chem: "vikram", phy: "rohan", alg: "rohan" },
  };
}
