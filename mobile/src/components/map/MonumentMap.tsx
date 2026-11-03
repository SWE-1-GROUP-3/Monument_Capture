import MapView, { Marker } from "react-native-maps";

import { getValidMonuments, isValidCoordinate } from "../../utils/mapData";

import { MARKER_COLORS, NYC_REGION, type MonumentMapProps } from "./types";

export function MonumentMap({ monuments, playerLocation, onSelect, height = 420 }: MonumentMapProps) {
  return (
    <MapView style={{ width: "100%", height }} initialRegion={NYC_REGION}>
      {getValidMonuments(monuments).map((monument) => (
        <Marker
          key={monument.id}
          identifier={monument.id}
          coordinate={{ latitude: monument.latitude, longitude: monument.longitude }}
          title={monument.name}
          description={monument.subtitle}
          pinColor={MARKER_COLORS[monument.status ?? "free"] ?? MARKER_COLORS.free}
          onCalloutPress={onSelect ? () => onSelect(monument.id) : undefined}
        />
      ))}
      {isValidCoordinate(playerLocation) ? (
        <Marker coordinate={playerLocation} title="Your location" pinColor="blue" />
      ) : null}
    </MapView>
  );
}
