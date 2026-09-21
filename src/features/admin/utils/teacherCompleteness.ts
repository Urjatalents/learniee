export interface CompletenessItem {
  key: string;
  label: string;
  required: boolean;
  done: boolean;
}

/**
 * What an application should contain before Admin approves it. Onboarding
 * doesn't force every upload, so Admin needs to see at a glance what's missing.
 * (Profile photo and certifications/awards are optional, so they aren't counted.)
 */
const CHECKLIST: Array<{ key: string; label: string; required: boolean }> = [
  { key: "INTRO_VIDEO", label: "Video introduction", required: true },
  { key: "DOB_PROOF", label: "Date of birth proof", required: true },
  { key: "ADDRESS_PROOF", label: "Address proof", required: true },
  { key: "QUALIFICATION_PROOF", label: "Qualification proof", required: true },
  { key: "PAN", label: "PAN card number", required: true },
  { key: "PROFILE_PHOTO", label: "Profile photo", required: false },
];

export function getCompleteness(fileTypes: string[], hasPan: boolean) {
  const items: CompletenessItem[] = CHECKLIST.map((item) => ({
    ...item,
    done: item.key === "PAN" ? hasPan : fileTypes.includes(item.key),
  }));

  const missingRequired = items.filter((i) => i.required && !i.done).length;

  return { items, missingRequired };
}
