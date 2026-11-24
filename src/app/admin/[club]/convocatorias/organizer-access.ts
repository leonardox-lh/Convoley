// shortcut: there is no login yet, so anyone could create, edit or cancel events; this keeps
// those pages off in production. Replace with the organizer check from HU-01.
export function isEventManagementEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
