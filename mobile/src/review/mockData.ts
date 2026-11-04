// Hardcoded data for the frontend prototype. Replace with API results later.
import type { Capture, CaptureReview, ReviewState, ReviewUser } from "./types";

export const MOCK_VERSION = 1;

export const mockUsers: ReviewUser[] = [
  { id: "u-alex", name: "Alex Rivera", role: "player" },
  { id: "u-sam", name: "Sam Chen", role: "player" },
  { id: "u-morgan", name: "Morgan Lee", role: "moderator" },
];

const MINUTE = 60_000;

/** A generated placeholder image so mock captures have a photo to review. */
export function samplePhoto(label: string, hue: number): string {
  const safe = label.replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">`
    + `<rect width="640" height="480" fill="hsl(${hue},45%,70%)"/>`
    + `<rect x="270" y="150" width="100" height="260" fill="hsl(${hue},25%,30%)"/>`
    + `<polygon points="250,150 320,90 390,150" fill="hsl(${hue},25%,30%)"/>`
    + `<rect x="0" y="410" width="640" height="70" fill="hsl(${hue},20%,35%)"/>`
    + `<text x="320" y="455" font-family="sans-serif" font-size="24" fill="white" text-anchor="middle">${safe}</text>`
    + `<text x="320" y="40" font-family="sans-serif" font-size="16" fill="white" text-anchor="middle">Sample photo (mock data)</text>`
    + `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Starting data: two captures in the queue, one approved and one rejected, relative to `now`. */
export function createMockState(now: number): ReviewState {
  const capture = (id: string, monumentId: string, playerId: string, status: Capture["status"], minutesAgo: number, hue: number, label: string): Capture => ({
    id, monumentId, playerId, status, monumentPhotoUri: samplePhoto(label, hue), distanceMeters: 20 + minutesAgo, submittedAt: now - minutesAgo * MINUTE,
  });
  const captures: Capture[] = [
    capture("c-1", "bethesda", "u-sam", "pending", 12, 200, "Bethesda Fountain"),
    capture("c-2", "grant", "u-alex", "pending", 4, 30, "General Grant National Memorial"),
    capture("c-3", "liberty", "u-alex", "approved", 90, 150, "Statue of Liberty"),
    capture("c-4", "flatiron-worth", "u-alex", "rejected", 180, 0, "Worth Monument"),
  ];
  const reviews: CaptureReview[] = [
    { id: "r-3", captureId: "c-3", moderatorId: "u-morgan", decision: "approved", reason: "", reviewedAt: now - 80 * MINUTE },
    { id: "r-4", captureId: "c-4", moderatorId: "u-morgan", decision: "rejected", reason: "Photo is of a laptop screen, not the monument.", reviewedAt: now - 170 * MINUTE },
  ];
  return { version: MOCK_VERSION, users: mockUsers.map((u) => ({ ...u })), captures, reviews, currentUserId: "u-alex" };
}
