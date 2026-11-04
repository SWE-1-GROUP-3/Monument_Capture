import type { CaptureMonument, PlayerPosition, ProximityEvaluation } from "./types";

export const MAX_ACCEPTABLE_ACCURACY_METERS = 50;
export const MAX_LOCATION_AGE_MS = 15_000;

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function isValidCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90
    && Math.abs(longitude) <= 180;
}

export function distanceInMeters(
  from: Pick<PlayerPosition, "latitude" | "longitude">,
  to: Pick<CaptureMonument, "latitude" | "longitude">,
) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function evaluateCaptureProximity(
  monument: CaptureMonument,
  position: PlayerPosition,
  nowMs = Date.now(),
): ProximityEvaluation {
  const locationAgeMs = nowMs - position.timestampMs;
  const validTimestamp = Number.isFinite(position.timestampMs)
    && locationAgeMs >= 0
    && locationAgeMs <= MAX_LOCATION_AGE_MS;

  if (!validTimestamp) {
    return { status: "stale" };
  }

  const validAccuracy = position.accuracyMeters !== null
    && Number.isFinite(position.accuracyMeters)
    && position.accuracyMeters > 0
    && position.accuracyMeters <= MAX_ACCEPTABLE_ACCURACY_METERS;

  if (
    !validAccuracy
    || !isValidCoordinate(position.latitude, position.longitude)
    || !isValidCoordinate(monument.latitude, monument.longitude)
    || !Number.isFinite(monument.captureRadiusMeters)
    || monument.captureRadiusMeters <= 0
  ) {
    return { status: "inaccurate" };
  }

  const preciseDistanceMeters = distanceInMeters(position, monument);
  if (preciseDistanceMeters <= monument.captureRadiusMeters) {
    return { status: "eligible", distanceMeters: Math.round(preciseDistanceMeters) };
  }

  const distanceMeters = Math.ceil(preciseDistanceMeters);
  return {
    status: "outside",
    distanceMeters,
    metersToMoveCloser: Math.ceil(preciseDistanceMeters - monument.captureRadiusMeters),
  };
}
