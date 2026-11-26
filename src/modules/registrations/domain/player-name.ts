/** "José  Pérez" and "jose perez" are the same player name: no case, accents or extra spaces. */
export function playerNameKey(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isNameTaken(
  name: { firstName: string; lastName: string },
  activeNames: { firstName: string; lastName: string }[],
): boolean {
  const key = playerNameKey(name.firstName, name.lastName);
  return activeNames.some((other) => playerNameKey(other.firstName, other.lastName) === key);
}
