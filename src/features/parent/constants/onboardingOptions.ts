// Curated option lists for onboarding selects. All backing fields are plain
// `String?` columns (see 03-DATA-MODEL.md), so these are a UX convenience,
// not a schema/enum constraint — safe to extend without a migration.
//
// Flagged assumption: exact option sets for tuitionType / currency / timezone /
// relationToStudent / modeOfCommunication / preferredLanguage / howDidYouHear
// weren't specified anywhere in the module specs, so these are reasonable
// defaults for an India-based tutoring platform with an NRI parent segment.
// Confirm against `Parent-Module-Spec.md` if a authoritative list exists.

export const TUITION_TYPE_OPTIONS = ["Online Tuition"] as const;

export const NRI_OR_INDIAN_OPTIONS = ["Indian", "NRI"] as const;

export const RELATION_TO_STUDENT_OPTIONS = [
  "Mother",
  "Father",
  "Guardian",
  "Other",
] as const;

export const CURRENCY_OPTIONS = [
  "INR - Indian Rupee",
  "USD - US Dollar",
  "GBP - British Pound",
  "EUR - Euro",
  "AED - UAE Dirham",
  "CAD - Canadian Dollar",
  "AUD - Australian Dollar",
  "SGD - Singapore Dollar",
] as const;

// Common timezones for an India-based platform with an NRI audience,
// rather than the full ~400-entry IANA list.
export const TIMEZONE_OPTIONS = [
  "Asia/Kolkata (IST)",
  "Asia/Dubai (GST)",
  "Asia/Singapore (SGT)",
  "Europe/London (GMT/BST)",
  "America/New_York (ET)",
  "America/Chicago (CT)",
  "America/Los_Angeles (PT)",
  "America/Toronto (ET)",
  "Australia/Sydney (AEST)",
] as const;

export const GENDER_OPTIONS = [
  "Male",
  "Female",
  "Other",
  "Prefer not to say",
] as const;

export const STANDARD_OPTIONS = [
  "Nursery",
  "LKG",
  "UKG",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
  "Other",
] as const;

export const BOARD_OPTIONS = [
  "CBSE",
  "ICSE",
  "State Board",
  "IB",
  "IGCSE",
  "Other",
] as const;

export const ONLINE_TUITION_OPTIONS = ["Yes", "No", "No preference"] as const;

export const COMMUNICATION_MODE_OPTIONS = [
  "Phone Call",
  "WhatsApp",
  "Email",
  "In-app Chat",
] as const;

export const PREFERRED_LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Marathi",
  "Gujarati",
  "Tamil",
  "Telugu",
  "Kannada",
  "Bengali",
  "Other",
] as const;

export const HOW_DID_YOU_HEAR_OPTIONS = [
  "Social Media",
  "Friend or Family Referral",
  "Google Search",
  "Advertisement",
  "Other",
] as const;
