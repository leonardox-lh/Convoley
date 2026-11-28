import type { Metadata } from "next";
import { ClubsSection, SiteHeader } from "../home-sections";

export const metadata: Metadata = { title: "Clubes · Convoley" };

/** Every club on Convoley, for when the home page shows only the first ones. */
export default function ClubsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader back />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
        <h1 className="sr-only">Clubes</h1>
        <ClubsSection title="Todos los clubes" />
      </main>
    </div>
  );
}
