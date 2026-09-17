import { Input } from "@/components/ui/input";
import type { Step2ChangeHandler, Step2FormData } from "@/features/teacher/types/step2";

interface Props {
  formData: Step2FormData;
  onChange: Step2ChangeHandler;
}

const yesNoSelect = (
  name: string,
  value: string,
  placeholder: string,
  onChange: Step2ChangeHandler,
) => (
  <select
    name={name}
    value={value}
    onChange={onChange}
    className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
  >
    <option value="">{placeholder}</option>
    <option value="Yes">Yes</option>
    <option value="No">No</option>
  </select>
);

export default function TeachingPreferencesSection({ formData, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        name="studentsTaught"
        placeholder="Number of Students taught"
        value={formData.studentsTaught}
        onChange={onChange}
      />

      <select
        name="hoursPerDay"
        value={formData.hoursPerDay}
        onChange={onChange}
        className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
      >
        <option value="">No of hours can teach a day</option>
        <option value="1">1 hour</option>
        <option value="2">2 hours</option>
        <option value="3">3 hours</option>
        <option value="4">4 hours</option>
        <option value="5+">5+ hours</option>
      </select>

      {yesNoSelect("haveOwnNotes", formData.haveOwnNotes, "Do you have your own notes", onChange)}

      {yesNoSelect(
        "canMakePresentations",
        formData.canMakePresentations,
        "Can you make Presentations",
        onChange,
      )}

      {yesNoSelect(
        "provideHomework",
        formData.provideHomework,
        "Will you provide homeworks & tests",
        onChange,
      )}

      {yesNoSelect(
        "conductPTM",
        formData.conductPTM,
        "Conduct parent-teacher meetings",
        onChange,
      )}
    </div>
  );
}
