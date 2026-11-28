import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { CopyButton } from "@/components/copy-button";
import { PageHeadingLoading } from "@/components/page-heading";
import { ScrollToTop } from "@/components/scroll-to-top";
import { appUrl } from "@/lib/app-url";
import { loadEventPreview } from "./event-preview";
import { PublicEventHero, PublicEventSteps } from "./public-event-hero";

type Props = LayoutProps<"/c/[club]/[event]">;

/** The event's header and its three steps stay put; only the step's page below loads. */
export default function PublicEventLayout({ children, params }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10">
      {/* Mounted once per event: moving between its steps keeps the scroll as Next does. */}
      <ScrollToTop />
      {/* Sign-ups, payments and scores show up without reloading. */}
      <AutoRefresh />
      <Suspense fallback={<PageHeadingLoading />}>
        <EventHeader params={params} />
      </Suspense>
      {children}
    </div>
  );
}

async function EventHeader({ params }: Pick<Props, "params">) {
  const { club, event: eventId } = await params;
  const [event, origin] = await Promise.all([loadEventPreview(club, eventId), appUrl()]);
  if (!event) notFound();
  return (
    <>
      <PublicEventHero
        club={club}
        event={event}
        action={
          <CopyButton
            text={`${origin}/c/${club}/${event.id}`}
            label="Link convocatoria"
            showLabel
            className="border-white/30 bg-white/15 text-white hover:bg-white/25 hover:text-white"
          />
        }
      />
      <PublicEventSteps club={club} eventId={event.id} />
    </>
  );
}
