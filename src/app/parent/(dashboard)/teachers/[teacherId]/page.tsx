import TeacherProfilePage from "@/features/teacher-profile/components/TeacherProfilePage";

export default async function ParentTeacherProfilePage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const { teacherId } = await params;

  return <TeacherProfilePage teacherId={teacherId} courseBasePath="/parent/courses" />;
}
