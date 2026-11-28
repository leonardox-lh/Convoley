import type { Metadata } from "next";
import { SiteHeader, UpcomingEventsSection } from "../home-sections";

export const metadata: Metadata = { title: "Convocatorias · Convoley" };

/** Every upcoming event of every club, for when the home page shows only the next ones. */
export default function UpcomingEventsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader back />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
        <h1 className="sr-only">Convocatorias</h1>
        <UpcomingEventsSection title="Próximas convocatorias" />
      </main>
    </div>
  );
}
