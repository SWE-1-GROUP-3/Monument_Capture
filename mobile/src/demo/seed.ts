import { LOCK_DURATION_MS } from "./rules";
import type { Capture, CaptureReview, DemoState, Monument, User } from "./types";

export const SEED_VERSION = 3;

/** Mock password for every demo account (US-01 mock login). Replace with real auth later. */
export const DEMO_PASSWORD = "demo123";

const MINUTE = 60_000;

export const seedUsers: User[] = [
  { id: "u-alex", name: "Alex Rivera", email: "alex@demo.test", role: "player" },
  { id: "u-sam", name: "Sam Chen", email: "sam@demo.test", role: "player" },
  { id: "u-priya", name: "Priya Patel", email: "priya@demo.test", role: "player" },
  { id: "u-morgan", name: "Morgan Lee", email: "mod@demo.test", role: "moderator" },
  // Iris's original US-01 mock account.
  { id: "u-demo", name: "Demo Player", email: "demo@example.com", role: "player" },
];

// Fifteen hand-entered NYC monuments: the MVP's single seeded play area.
// IDs match the existing US-02 map data where the monument already existed.
export const seedMonuments: Monument[] = [
  m("liberty", "Statue of Liberty", "Liberty Island", 40.6892, -74.0445, 150, "Copper colossus in New York Harbor, dedicated 1886."),
  m("washington-arch", "Washington Square Arch", "Greenwich Village", 40.7312, -73.9971, 100, "Marble triumphal arch at the foot of Fifth Avenue."),
  m("soldiers-sailors", "Soldiers' and Sailors' Arch", "Prospect Heights", 40.673, -73.97, 100, "Civil War memorial arch at Grand Army Plaza."),
  m("brooklyn-war", "Brooklyn War Memorial", "Downtown Brooklyn", 40.7005, -73.9897, 80, "Memorial to Brooklyn's WWII dead in Cadman Plaza."),
  m("grant", "General Grant National Memorial", "Morningside Heights", 40.8134, -73.9631, 100, "The largest mausoleum in North America."),
  m("bethesda", "Bethesda Fountain", "Central Park", 40.7744, -73.9703, 80, "Angel of the Waters, centrepiece of Bethesda Terrace."),
  m("obelisk", "Cleopatra's Needle", "Central Park", 40.7796, -73.9654, 80, "Ancient Egyptian obelisk behind the Met."),
  m("columbus", "Columbus Monument", "Columbus Circle", 40.7681, -73.9819, 80, "Granite column at the southwest corner of Central Park."),
  m("flatiron-worth", "Worth Monument", "Flatiron District", 40.7425, -73.9898, 60, "Obelisk and tomb of General William Jenkins Worth."),
  m("charging-bull", "Charging Bull", "Financial District", 40.7056, -74.0134, 60, "Bronze bull on Broadway at Bowling Green."),
  m("federal-hall", "George Washington at Federal Hall", "Financial District", 40.7073, -74.0104, 60, "Statue marking the site of Washington's 1789 inauguration."),
  m("alice", "Alice in Wonderland", "Central Park", 40.7755, -73.9666, 60, "Bronze sculpture near Conservatory Water."),
  m("imagine", "Strawberry Fields 'Imagine' Mosaic", "Central Park", 40.7757, -73.975, 60, "Memorial mosaic near the Dakota."),
  m("prison-ship", "Prison Ship Martyrs' Monument", "Fort Greene", 40.6915, -73.9755, 100, "Doric column honouring Revolutionary War prisoners."),
  m("farragut", "Admiral Farragut Monument", "Madison Square", 40.7426, -73.9878, 60, "Saint-Gaudens bronze in Madison Square Park."),
];

function m(
  id: string,
  name: string,
  neighborhood: string,
  latitude: number,
  longitude: number,
  captureRadiusMeters: number,
  description: string,
): Monument {
  return { id, name, neighborhood, description, latitude, longitude, captureRadiusMeters, active: true };
}

/** A generated placeholder image so seeded captures have something to review. */
export function samplePhoto(label: string, hue: number): string {
  const safe = label.replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">`
    + `<stop offset="0" stop-color="hsl(${hue},55%,78%)"/><stop offset="1" stop-color="hsl(${hue},40%,52%)"/>`
    + `</linearGradient></defs><rect width="640" height="480" fill="url(#g)"/>`
    + `<rect x="270" y="150" width="100" height="260" fill="hsl(${hue},25%,30%)"/>`
    + `<polygon points="250,150 320,90 390,150" fill="hsl(${hue},25%,30%)"/>`
    + `<rect x="0" y="410" width="640" height="70" fill="hsl(${hue},20%,35%)"/>`
    + `<text x="320" y="455" font-family="sans-serif" font-size="24" fill="white" text-anchor="middle">${safe}</text>`
    + `<text x="320" y="40" font-family="sans-serif" font-size="16" fill="white" text-anchor="middle">Sample photo (seed data)</text>`
    + `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Builds a fresh demo world relative to `now`, so a reset always shows the
 * same story: some monuments held, one lock just expired, a few in the queue.
 */
export function createSeedState(now: number): DemoState {
  const captures: Capture[] = [];
  const reviews: CaptureReview[] = [];
  let n = 0;

  const add = (
    monumentId: string,
    playerId: string,
    submittedMinutesAgo: number,
    outcome?: { decision: "approved" | "rejected"; reviewedMinutesAgo: number; reason: string },
  ) => {
    n += 1;
    const monument = seedMonuments.find((x) => x.id === monumentId)!;
    const submittedAt = now - submittedMinutesAgo * MINUTE;
    const capture: Capture = {
      id: `c-seed-${n}`,
      monumentId,
      playerId,
      status: outcome ? outcome.decision : "pending",
      distanceMeters: 8 + ((n * 17) % Math.max(10, monument.captureRadiusMeters - 10)),
      accuracyMeters: 6 + (n % 5) * 3,
      simulatedPosition: false,
      photoUri: samplePhoto(monument.name, (n * 47) % 360),
      startedAt: submittedAt - 2 * MINUTE,
      submittedAt,
    };
    captures.push(capture);
    if (outcome) {
      const reviewedAt = now - outcome.reviewedMinutesAgo * MINUTE;
      reviews.push({
        id: `r-seed-${n}`,
        captureId: capture.id,
        moderatorId: "u-morgan",
        decision: outcome.decision,
        reason: outcome.reason,
        reviewedAt,
        lockedUntil: outcome.decision === "approved" ? reviewedAt + LOCK_DURATION_MS : null,
      });
    }
  };

  // Currently held (lock still running).
  add("liberty", "u-alex", 45, { decision: "approved", reviewedMinutesAgo: 40, reason: "Clear shot from the ferry dock." });
  add("bethesda", "u-sam", 30, { decision: "approved", reviewedMinutesAgo: 25, reason: "Angel clearly visible." });
  add("obelisk", "u-priya", 15, { decision: "approved", reviewedMinutesAgo: 10, reason: "Matches reference view." });
  // Lock expired ten minutes ago, so the arch is contestable again.
  add("washington-arch", "u-sam", 75, { decision: "approved", reviewedMinutesAgo: 70, reason: "Good daylight photo." });
  // Submitted just before Sam's Bethesda capture was approved, so it is still in
  // the queue but can no longer be approved (demo of the one-holder rule).
  add("bethesda", "u-priya", 27);
  // Rejected history.
  add("flatiron-worth", "u-alex", 120, { decision: "rejected", reviewedMinutesAgo: 110, reason: "Photo is of a laptop screen, not the monument." });
  // Waiting in the moderator queue.
  add("grant", "u-priya", 12);
  add("columbus", "u-sam", 5);
  add("brooklyn-war", "u-alex", 2);

  return {
    version: SEED_VERSION,
    users: seedUsers.map((u) => ({ ...u })),
    monuments: seedMonuments.map((x) => ({ ...x })),
    captures,
    reviews,
    sessionUserId: null,
    settings: { clockOffsetMs: 0, location: { mode: "real" }, camera: "real" },
  };
}
