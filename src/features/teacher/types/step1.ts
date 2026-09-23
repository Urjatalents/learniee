import type { TeacherFileInput } from "@/features/teacher/server/teacherFile.service";

export interface Step1FormData {
  firstName: string;
  lastName: string;
  email: string;

  visibleName: string;

  dobDay: string;
  dobMonth: string;
  dobYear: string;

  gender: string;
  nationality: string;

  address: string;
  city: string;
  country: string;
  pincode: string;

  phone: string;
  whatsapp: string;

  aboutMe: string;
  criminalCase: string;

  /** Self-declared, no Admin approval gate — see schema.prisma. */
  isIITian: boolean;
}

export interface CognitoProfile {
  firstName: string;
  lastName: string;
  email: string;
}

export interface Step1FileInput {
  profilePhoto?: TeacherFileInput;
  introVideo?: TeacherFileInput;
}

/**
 * Editable fields only (excludes the Cognito-sourced firstName/
 * lastName/email), used server-side when a Teacher row doesn't exist
 * yet.
 */
export const emptyStep1EditableFields = {
  visibleName: "",

  dobDay: "",
  dobMonth: "",
  dobYear: "",

  gender: "",
  nationality: "",

  address: "",
  city: "",
  country: "",
  pincode: "",

  phone: "",
  whatsapp: "",

  aboutMe: "",
  criminalCase: "",

  isIITian: false,
};

/** Full empty form state (Cognito fields + editable fields), used client-side. */
export const emptyStep1FormData: Step1FormData = {
  firstName: "",
  lastName: "",
  email: "",
  ...emptyStep1EditableFields,
};
