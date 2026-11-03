// Screen-ready views over the demo state.
import type { HoldKind } from "../components/ui";
import type { MapMonument } from "../types/mapMonument";
import { formatRemaining, getHold } from "./rules";
import type { DemoState, Monument, MonumentHold } from "./types";

export type MonumentView = {
  monument: Monument;
  hold: MonumentHold;
  kind: HoldKind;
  /** e.g. "Held by Sam Chen · 34 min left" */
  statusLine: string;
};

export function monumentView(state: DemoState, monument: Monument, viewerId: string | undefined, now: number): MonumentView {
  const hold = getHold(state, monument.id, now);
  let kind: HoldKind = "free";
  let statusLine = "Free to capture";
  if (!monument.active) {
    kind = "inactive";
    statusLine = "Not currently in the game";
  } else if (hold.status === "held") {
    const mine = hold.holder.id === viewerId;
    kind = mine ? "mine" : "held";
    statusLine = `${mine ? "Held by you" : `Held by ${hold.holder.name}`} · ${formatRemaining(hold.lockedUntil - now)} left`;
  }
  return { monument, hold, kind, statusLine };
}

export function monumentViews(state: DemoState, viewerId: string | undefined, now: number, includeInactive = false) {
  return state.monuments
    .filter((m) => includeInactive || m.active)
    .map((m) => monumentView(state, m, viewerId, now));
}

export function toMapMonument(view: MonumentView): MapMonument {
  return {
    id: view.monument.id,
    name: view.monument.name,
    latitude: view.monument.latitude,
    longitude: view.monument.longitude,
    status: view.kind === "inactive" ? "free" : view.kind,
    subtitle: view.statusLine,
  };
}
