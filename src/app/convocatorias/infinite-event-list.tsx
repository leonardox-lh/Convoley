"use client";

import { useEffect, useRef, useState } from "react";
import { FormMessage } from "@/components/form";
import { VolleyballLoader } from "@/components/volleyball";
import {
  EVENT_LIST_CLASS,
  UpcomingEventCard,
  type UpcomingEventCardData,
} from "../upcoming-event-card";
import { loadMoreUpcomingEventsAction } from "./actions";

// Start loading a bit before the end shows, so scrolling rarely has to wait.
const PRELOAD_MARGIN = "400px";

/** The first page comes from the server; the next ones load as the end comes into view. */
export function InfiniteEventList(props: { initial: UpcomingEventCardData[]; hasMore: boolean }) {
  const [cards, setCards] = useState(props.initial);
  const [hasMore, setHasMore] = useState(props.hasMore);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasMore || loading || failed) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setLoading(true);
        try {
          const page = await loadMoreUpcomingEventsAction(cards.length);
          // A card already shown (e.g. a new event shifted the pages) isn't repeated.
          setCards((current) => [
            ...current,
            ...page.cards.filter((card) => !current.some((shown) => shown.id === card.id)),
          ]);
          setHasMore(page.hasMore);
        } catch {
          setFailed(true);
        } finally {
          setLoading(false);
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [cards.length, hasMore, loading, failed]);

  return (
    <>
      <ul className={EVENT_LIST_CLASS}>
        {cards.map((card) => (
          <UpcomingEventCard key={card.id} event={card} />
        ))}
      </ul>
      <div ref={sentinel} />
      {loading && <VolleyballLoader label="Cargando más convocatorias…" className="py-6" />}
      {failed && (
        <div className="flex flex-col items-center gap-2">
          <FormMessage tone="error">No pudimos cargar más convocatorias.</FormMessage>
          <button
            type="button"
            onClick={() => setFailed(false)}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}
    </>
  );
}
