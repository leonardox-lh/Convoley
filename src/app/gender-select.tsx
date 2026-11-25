import { fieldClass } from "@/components/form";
import { GENDER_LABELS } from "./player-labels";

/** HU-31: required in mixed events so teams can include the minimum of women. */
export function GenderSelect() {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      Juegas como
      <select name="gender" required defaultValue="" className={fieldClass}>
        <option value="" disabled>
          Elige
        </option>
        {Object.entries(GENDER_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
