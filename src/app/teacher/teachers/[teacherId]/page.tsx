import TeacherProfilePage from "@/features/teacher-profile/components/TeacherProfilePage";

export default async function TeacherViewsTeacherProfilePage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const { teacherId } = await params;

  // Teachers can't open Parent course pages, so the course cards are read-only here.
  return <TeacherProfilePage teacherId={teacherId} />;
}
