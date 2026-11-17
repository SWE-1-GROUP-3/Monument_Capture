import type { MapMonument } from "../types/mapMonument";

const now = Date.now();

/** Map records used only by component and validation tests. */
export const mapMonuments: MapMonument[] = [
  { id: "liberty", name: "Statue of Liberty", latitude: 40.6892, longitude: -74.0445, captureRadiusMeters: 100, hold: null },
  { id: "washington-arch", name: "Washington Square Arch", latitude: 40.7312, longitude: -73.9971, captureRadiusMeters: 100, hold: { holderDisplayName: "Player A", lockExpiresAt: new Date(now + 3 * 60 * 60_000).toISOString() } },
  { id: "soldiers-sailors", name: "Soldiers' and Sailors' Arch", latitude: 40.673, longitude: -73.97, captureRadiusMeters: 100, hold: { holderDisplayName: "Player B", lockExpiresAt: new Date(now - 5 * 60_000).toISOString() } },
  { id: "brooklyn-war", name: "Brooklyn War Memorial", latitude: 40.7005, longitude: -73.9897, captureRadiusMeters: 100, hold: null },
  { id: "grant", name: "General Grant National Memorial", latitude: 40.8134, longitude: -73.9631, captureRadiusMeters: 100, hold: null },
  { id: "bethesda", name: "Bethesda Fountain", latitude: 40.7744, longitude: -73.9703, captureRadiusMeters: 100, hold: null },
  { id: "obelisk", name: "Cleopatra's Needle", latitude: 40.7796, longitude: -73.9654, captureRadiusMeters: 100, hold: null },
  { id: "columbus", name: "Columbus Monument", latitude: 40.7681, longitude: -73.9819, captureRadiusMeters: 100, hold: null },
  { id: "flatiron-worth", name: "Worth Monument", latitude: 40.7425, longitude: -73.9898, captureRadiusMeters: 100, hold: null },
];
