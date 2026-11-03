import type { MapCoordinate, MapMonument } from "../types/mapMonument";

export function isValidCoordinate(value: unknown): value is MapCoordinate {
  if (!value || typeof value !== "object") return false;
  const { latitude, longitude } = value as MapCoordinate;
  return typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

// Treat missing API data as empty and discard malformed or duplicate records.
export function getValidMonuments(data: unknown): MapMonument[] {
  if (!Array.isArray(data)) return [];
  const ids = new Set<string>();
  return data.filter((record): record is MapMonument => {
    if (!isValidCoordinate(record)) return false;
    const { id, name } = record as MapMonument;
    if (typeof id !== "string" || !id.trim() || typeof name !== "string" || !name.trim() || ids.has(id)) return false;
    ids.add(id);
    return true;
  });
}
