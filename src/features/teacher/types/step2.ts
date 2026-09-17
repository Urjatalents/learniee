export interface Step2FormData {
  referredBy: string;
  qualifications: string;
  overallExperience: string;
  comfortableLanguage: string;
  schoolsTaught: string;

  workingInSchool: boolean;
  schoolName: string;

  workingInAcademy: boolean;
  academyName: string;

  studentsTaught: string;
  hoursPerDay: string;

  haveOwnNotes: string;
  canMakePresentations: string;
  provideHomework: string;
  conductPTM: string;

  hasLaptop: boolean;
  hasPenTab: boolean;
  proficientInEnglish: boolean;

  additionalInfo: string;

  facebook: string;
  linkedin: string;
  instagram: string;
  youtube: string;

  notWithOtherAcademy: boolean;
}

export const initialStep2FormData: Step2FormData = {
  referredBy: "",
  qualifications: "",
  overallExperience: "",
  comfortableLanguage: "",
  schoolsTaught: "",

  workingInSchool: false,
  schoolName: "",

  workingInAcademy: false,
  academyName: "",

  studentsTaught: "",
  hoursPerDay: "",

  haveOwnNotes: "",
  canMakePresentations: "",
  provideHomework: "",
  conductPTM: "",

  hasLaptop: false,
  hasPenTab: false,
  proficientInEnglish: false,

  additionalInfo: "",

  facebook: "",
  linkedin: "",
  instagram: "",
  youtube: "",

  notWithOtherAcademy: false,
};

/** Type for the change handler shared by every Step 2 section component. */
export type Step2ChangeHandler = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
) => void;

/**
 * Server-side save payload: the same fields as Step2FormData plus the
 * optional uploaded files. Extends rather than re-declaring the field
 * list, which used to be duplicated verbatim in step2.service.ts.
 */
export interface Step2FormInput extends Step2FormData {
  certifications?: import("@/features/teacher/server/teacherFile.service").TeacherFileInput[];
  awards?: import("@/features/teacher/server/teacherFile.service").TeacherFileInput[];
}

/**
 * Maps the API's `professionalInfo` record (nullable fields) onto the
 * client form shape (empty-string/false defaults). Extracted out of
 * useTeacherStep2Form.ts's load effect to keep that hook shorter.
 */
export function mapProfessionalInfoToFormData(professionalInfo: {
  referredBy?: string | null;
  qualifications?: string | null;
  overallExperience?: string | null;
  comfortableLanguage?: string | null;
  schoolsTaught?: string | null;
  workingInSchool?: boolean | null;
  schoolName?: string | null;
  workingInAcademy?: boolean | null;
  academyName?: string | null;
  studentsTaught?: string | null;
  hoursPerDay?: string | null;
  haveOwnNotes?: string | null;
  canMakePresentations?: string | null;
  provideHomework?: string | null;
  conductPTM?: string | null;
  hasLaptop?: boolean | null;
  hasPenTab?: boolean | null;
  proficientInEnglish?: boolean | null;
  additionalInfo?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  notWithOtherAcademy?: boolean | null;
}): Step2FormData {
  return {
    referredBy: professionalInfo.referredBy ?? "",
    qualifications: professionalInfo.qualifications ?? "",
    overallExperience: professionalInfo.overallExperience ?? "",
    comfortableLanguage: professionalInfo.comfortableLanguage ?? "",
    schoolsTaught: professionalInfo.schoolsTaught ?? "",

    workingInSchool: professionalInfo.workingInSchool ?? false,
    schoolName: professionalInfo.schoolName ?? "",

    workingInAcademy: professionalInfo.workingInAcademy ?? false,
    academyName: professionalInfo.academyName ?? "",

    studentsTaught: professionalInfo.studentsTaught ?? "",
    hoursPerDay: professionalInfo.hoursPerDay ?? "",

    haveOwnNotes: professionalInfo.haveOwnNotes ?? "",
    canMakePresentations: professionalInfo.canMakePresentations ?? "",
    provideHomework: professionalInfo.provideHomework ?? "",
    conductPTM: professionalInfo.conductPTM ?? "",

    hasLaptop: professionalInfo.hasLaptop ?? false,
    hasPenTab: professionalInfo.hasPenTab ?? false,
    proficientInEnglish: professionalInfo.proficientInEnglish ?? false,

    additionalInfo: professionalInfo.additionalInfo ?? "",

    facebook: professionalInfo.facebook ?? "",
    linkedin: professionalInfo.linkedin ?? "",
    instagram: professionalInfo.instagram ?? "",
    youtube: professionalInfo.youtube ?? "",

    notWithOtherAcademy: professionalInfo.notWithOtherAcademy ?? false,
  };
}
