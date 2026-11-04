import type { MapMonument } from "../types/mapMonument";

// Initialize once per module load, keeping demo timestamps stable across navigation and rerenders.
const initializedAt = Date.now();

// Prototype play area: New York City. Replace this array with API results later.
// 100 metres is this sprint's prototype default.
// The backend will later supply each monument's configurable capture_radius_m.
export const mapMonuments: MapMonument[] = [
  { id: "liberty", name: "Statue of Liberty", latitude: 40.6892, longitude: -74.0445, captureRadiusMeters: 100, hold: null },
  {
    id: "washington-arch", name: "Washington Square Arch", latitude: 40.7312, longitude: -73.9971,
    captureRadiusMeters: 100,
    hold: { holderDisplayName: "Demo Player A", lockExpiresAt: new Date(initializedAt + 3 * 60 * 60_000).toISOString() },
  },
  {
    id: "soldiers-sailors", name: "Soldiers' and Sailors' Arch", latitude: 40.673, longitude: -73.970,
    captureRadiusMeters: 100,
    hold: { holderDisplayName: "Demo Player B", lockExpiresAt: new Date(initializedAt - 5 * 60_000).toISOString() },
  },
  { id: "brooklyn-war", name: "Brooklyn War Memorial", latitude: 40.7005, longitude: -73.9897, captureRadiusMeters: 100, hold: null },
  { id: "grant", name: "General Grant National Memorial", latitude: 40.8134, longitude: -73.9631, captureRadiusMeters: 100, hold: null },
  { id: "bethesda", name: "Bethesda Fountain", latitude: 40.7744, longitude: -73.9703, captureRadiusMeters: 100, hold: null },
  { id: "obelisk", name: "Cleopatra's Needle", latitude: 40.7796, longitude: -73.9654, captureRadiusMeters: 100, hold: null },
  { id: "columbus", name: "Columbus Monument", latitude: 40.7681, longitude: -73.9819, captureRadiusMeters: 100, hold: null },
  { id: "flatiron-worth", name: "Worth Monument", latitude: 40.7425, longitude: -73.9898, captureRadiusMeters: 100, hold: null },
];
