// Type-only imports: client components use these labels without loading the module.
import type { PlayerGender, PlayerLevel, PlayerPosition } from "@/modules/registrations";

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  setter: "Armador",
  libero: "Líbero",
  outside_hitter: "Punta",
  middle_blocker: "Central",
  opposite: "Opuesto",
  any: "Cualquiera",
};

export const LEVEL_LABELS: Record<PlayerLevel, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

export const GENDER_LABELS: Record<PlayerGender, string> = {
  female: "Chica",
  male: "Chico",
};
