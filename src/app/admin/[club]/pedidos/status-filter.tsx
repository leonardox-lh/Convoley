"use client";

import { useRouter } from "next/navigation";
import { SelectPicker } from "@/components/date-time-pickers";

const ALL = "todos";

/** Order status picker across the whole row; choosing one reloads the list with ?estado=. */
export function StatusFilter(props: {
  basePath: string;
  value: string | undefined;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  return (
    <SelectPicker
      // Remount when the URL changes (back button) so it shows the current filter.
      key={props.value ?? ALL}
      label="Estado"
      name="estado"
      defaultValue={props.value ?? ALL}
      options={[{ value: ALL, label: "Todos" }, ...props.options]}
      onChange={(estado) =>
        router.push(estado === ALL ? props.basePath : `${props.basePath}?estado=${estado}`)
      }
    />
  );
}
