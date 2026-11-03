export type MapMonument = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Hold status used for the marker colour. Defaults to "free". */
  status?: "free" | "held" | "mine";
  /** Extra popup line, e.g. "Held by Sam · 34 min left". */
  subtitle?: string;
};

export type MapCoordinate = Pick<MapMonument, "latitude" | "longitude">;
