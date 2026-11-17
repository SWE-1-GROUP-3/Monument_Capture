import type { DemoState, Monument, User } from "./types";

export const SEED_VERSION = 7;

/** Temporary local credentials until backend authentication is connected. */
export const LOCAL_PASSWORD = "local123";

const DAY_MS = 24 * 60 * 60_000;

const JOINED_DAYS_AGO: Record<string, number> = {
  "u-alex": 34,
  "u-sam": 30,
  "u-priya": 21,
  "u-morgan": 40,
};

export const seedUsers: User[] = [
  { id: "u-alex", name: "Alex Rivera", email: "alex@monument.local", role: "player" },
  { id: "u-sam", name: "Sam Chen", email: "sam@monument.local", role: "player" },
  { id: "u-priya", name: "Priya Patel", email: "priya@monument.local", role: "player" },
  { id: "u-morgan", name: "Morgan Lee", email: "moderator@monument.local", role: "moderator" },
];

const ICONS: Record<string, string> = {
  liberty: "🗽", "washington-arch": "🏛️", "soldiers-sailors": "🎖️", "brooklyn-war": "🕊️", grant: "⚱️",
  bethesda: "⛲", obelisk: "🏺", columbus: "🧭", "flatiron-worth": "⚔️", "charging-bull": "🐂",
  "federal-hall": "🎩", alice: "🐇", imagine: "☮️", "prison-ship": "⚓", farragut: "⛵",
};

/** Initial monument catalog used until it is loaded from the backend. */
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

function m(id: string, name: string, neighborhood: string, latitude: number, longitude: number, captureRadiusMeters: number, description: string): Monument {
  return { id, name, neighborhood, description, latitude, longitude, captureRadiusMeters, icon: ICONS[id] ?? "📍", active: true };
}

/** Builds a clean local state with no fabricated capture or review history. */
export function createSeedState(now: number): DemoState {
  return {
    version: SEED_VERSION,
    users: seedUsers.map((user) => ({ ...user, joinedAt: now - (JOINED_DAYS_AGO[user.id] ?? 1) * DAY_MS })),
    monuments: seedMonuments.map((monument) => ({ ...monument })),
    captures: [],
    reviews: [],
    sessionUserId: null,
  };
}
