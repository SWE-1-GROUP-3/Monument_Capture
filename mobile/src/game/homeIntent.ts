// Returning to the map from a pushed screen (capture flow, review, editor).
// Going *back* reuses the map that is already open; the intent tells it which
// sheet to show. Only when there is no history (e.g. after a refresh) does it
// open the map fresh, with the intent as URL parameters instead.
import { router } from "expo-router";
import { useEffect } from "react";

import type { SheetKind } from "./types";

export type HomeIntent = { monumentId?: string; sheet?: SheetKind; submitted?: boolean };

let pending: HomeIntent | null = null;
const listeners = new Set<() => void>();

function toHref(i: HomeIntent) {
  const q = new URLSearchParams();
  if (i.monumentId) q.set("monument", i.monumentId);
  if (i.sheet) q.set("sheet", i.sheet);
  if (i.submitted) q.set("submitted", "1");
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

export function returnToMap(intent: HomeIntent = {}) {
  if (router.canGoBack()) {
    pending = intent;
    listeners.forEach((l) => l());
    router.back();
  } else {
    router.replace(toHref(intent) as never);
  }
}

/** Lets the map home react to an intent left by returnToMap. */
export function useHomeIntent(onIntent: (intent: HomeIntent) => void) {
  useEffect(() => {
    const consume = () => {
      if (!pending) return;
      const i = pending;
      pending = null;
      onIntent(i);
    };
    consume();
    listeners.add(consume);
    return () => {
      listeners.delete(consume);
    };
  }, [onIntent]);
}
