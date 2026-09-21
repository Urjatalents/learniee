export type TeacherApprovalState = "PENDING" | "APPROVED" | "REJECTED";

/** One row in the Admin "Teacher Applications" list (no files / signed URLs — those load on the detail page). */
export interface AdminTeacherSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  visibleName: string | null;
  city: string | null;
  country: string | null;
  qualifications: string | null;
  overallExperience: string | null;
  approvalStatus: TeacherApprovalState;
  createdAt: string;
  /** Last change to the application — the submission time while it is still pending. */
  updatedAt: string;
  /** Types of the files uploaded so far (e.g. "DOB_PROOF") — used for the completeness check. */
  fileTypes: string[];
  hasPan: boolean;
}

export type TeacherApprovalCounts = Record<TeacherApprovalState, number>;

export interface AdminTeacher {
  id: string;
  cognitoId: string;
  email: string;
  firstName: string;
  lastName: string;
  visibleName: string | null;

  dobDay: number | null;
  dobMonth: string | null;
  dobYear: number | null;

  gender: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  pincode: string | null;
  phone: string | null;
  whatsapp: string | null;
  aboutMe: string | null;
  criminalCase: string | null;
  panCardNumber: string | null;
  onboardingStatus: string;
  onboardingComplete: boolean;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;

  professionalInfo: {
    referredBy: string | null;
    qualifications: string | null;
    overallExperience: string | null;
    comfortableLanguage: string | null;
    schoolsTaught: string | null;

    workingInSchool: boolean;
    schoolName: string | null;

    workingInAcademy: boolean;
    academyName: string | null;

    studentsTaught: string | null;
    hoursPerDay: string | null;

    haveOwnNotes: string | null;
    canMakePresentations: string | null;
    provideHomework: string | null;
    conductPTM: string | null;

    hasLaptop: boolean;
    hasPenTab: boolean;
    proficientInEnglish: boolean;

    notWithOtherAcademy: boolean;

    additionalInfo: string | null;

    facebook: string | null;
    linkedin: string | null;
    instagram: string | null;
    youtube: string | null;
  } | null;

 files: Array<{
  id: string;

  type:
    | "PROFILE_PHOTO"
    | "INTRO_VIDEO"
    | "CERTIFICATION"
    | "AWARD"
    | "DOB_PROOF"
    | "ADDRESS_PROOF"
    | "QUALIFICATION_PROOF";

  s3Key: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;

  viewUrl: string;
}>;
}