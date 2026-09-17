import { Section, InfoField } from "@/features/admin/components/shared/ReviewSection";
import type { AdminTeacher } from "@/features/admin/types/teacher";

export default function TeacherProfessionalSection({ teacher }: { teacher: AdminTeacher }) {
  const info = teacher.professionalInfo;

  return (
    <>
      <Section title="Professional Information">
        <InfoField label="Referred By" value={info?.referredBy} />
        <InfoField label="Qualifications" value={info?.qualifications} />
        <InfoField label="Overall Experience" value={info?.overallExperience} />
        <InfoField label="Comfortable Language" value={info?.comfortableLanguage} />

        <div className="md:col-span-3">
          <InfoField label="Schools Taught" value={info?.schoolsTaught} />
        </div>
      </Section>

      <Section title="Current Work">
        <InfoField label="Working in School" value={info?.workingInSchool ? "Yes" : "No"} />
        <InfoField label="School Name" value={info?.schoolName} />
        <InfoField label="Working in Academy" value={info?.workingInAcademy ? "Yes" : "No"} />
        <InfoField label="Academy Name" value={info?.academyName} />
      </Section>

      <Section title="Tuition Information">
        <InfoField label="Students Taught" value={info?.studentsTaught} />
        <InfoField label="Hours Per Day" value={info?.hoursPerDay} />
        <InfoField label="Own Notes" value={info?.haveOwnNotes} />
        <InfoField label="Can Make Presentations" value={info?.canMakePresentations} />
        <InfoField label="Provides Homework & Tests" value={info?.provideHomework} />
        <InfoField label="Conducts PTM" value={info?.conductPTM} />
      </Section>

      <Section title="Equipment & Skills">
        <InfoField label="Has Laptop" value={info?.hasLaptop ? "Yes" : "No"} />
        <InfoField label="Has Pen Tablet" value={info?.hasPenTab ? "Yes" : "No"} />
        <InfoField label="Proficient in English" value={info?.proficientInEnglish ? "Yes" : "No"} />
        <InfoField
          label="Not Working With Other Academy"
          value={info?.notWithOtherAcademy ? "Yes" : "No"}
        />
      </Section>

      <Section title="Additional Information">
        <div className="md:col-span-3">
          <InfoField label="Additional Information" value={info?.additionalInfo} />
        </div>
      </Section>

      <Section title="Social Media">
        <InfoField label="Facebook" value={info?.facebook} />
        <InfoField label="LinkedIn" value={info?.linkedin} />
        <InfoField label="Instagram" value={info?.instagram} />
        <InfoField label="YouTube" value={info?.youtube} />
      </Section>
    </>
  );
}
