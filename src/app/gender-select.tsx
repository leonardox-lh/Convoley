import { Field, fieldClass } from "@/components/form";
import { GENDER_LABELS } from "./player-labels";

/** HU-31: required in mixed events so teams can include the minimum of women. */
export function GenderSelect({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <Field label="Juegas como" float="always">
      <select name="gender" required defaultValue={defaultValue ?? ""} className={fieldClass}>
        <option value="" disabled>
          Elige
        </option>
        {Object.entries(GENDER_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  );
}
