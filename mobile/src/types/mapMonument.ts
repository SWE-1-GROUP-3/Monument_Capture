export type MapMonument = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type MapCoordinate = Pick<MapMonument, "latitude" | "longitude">;
