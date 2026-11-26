import { SelectPicker } from "@/components/date-time-pickers";
import { GENDER_LABELS } from "./player-labels";

const GENDER_OPTIONS = [
  { value: "male", label: GENDER_LABELS.male },
  { value: "female", label: GENDER_LABELS.female },
];

/** HU-31: required in mixed events so teams can include the minimum of women; "Chico" by default. */
export function GenderSelect({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <SelectPicker
      label="Juegas como"
      name="gender"
      options={GENDER_OPTIONS}
      defaultValue={defaultValue ?? "male"}
    />
  );
}
