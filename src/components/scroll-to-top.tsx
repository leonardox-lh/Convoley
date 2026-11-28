"use client";

import { useLayoutEffect } from "react";

/**
 * Starts the screen at the top when it opens. Next keeps the previous page's scroll when the new
 * one streams in, so an event opened from far down a list showed up half scrolled.
 */
export function ScrollToTop() {
  // Also runs when a screen visited before (kept hidden) is shown again.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return null;
}
