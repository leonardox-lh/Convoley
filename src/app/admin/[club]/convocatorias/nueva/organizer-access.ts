// shortcut: there is no login yet, so anyone could create events; this keeps the page off
// in production. Replace with the organizer check from HU-01.
export function isEventCreationEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
