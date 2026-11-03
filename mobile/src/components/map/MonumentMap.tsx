import MapView, { Marker } from "react-native-maps";

import { getValidMonuments, isValidCoordinate } from "../../utils/mapData";

import { NYC_REGION, type MonumentMapProps } from "./types";

export function MonumentMap({ monuments, playerLocation }: MonumentMapProps) {
  return (
    <MapView style={{ width: "100%", height: 420 }} initialRegion={NYC_REGION}>
      {getValidMonuments(monuments).map((monument) => (
        <Marker key={monument.id} identifier={monument.id} coordinate={monument} title={monument.name} />
      ))}
      {isValidCoordinate(playerLocation) ? (
        <Marker coordinate={playerLocation} title="Your location" pinColor="blue" />
      ) : null}
    </MapView>
  );
}
