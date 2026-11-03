import { useState } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { getValidMonuments, isValidCoordinate } from "../../utils/mapData";

import { NYC_REGION, type MonumentMapProps } from "./types";

// Inline icons avoid missing Leaflet image assets in the Expo web bundle.
function pin(color: string) {
  return divIcon({
    className: "monument-map-pin",
    html: `<span aria-hidden="true" style="display:block;width:22px;height:22px;border:3px solid white;border-radius:50%;background:${color};box-shadow:0 1px 5px #555"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}
const monumentIcon = pin("#176b47");
const playerIcon = pin("#2563eb");

export function MonumentMap({ monuments, playerLocation }: MonumentMapProps) {
  const [tileError, setTileError] = useState(false);
  return (
    <div>
      <MapContainer
        center={[NYC_REGION.latitude, NYC_REGION.longitude]}
        zoom={11}
        style={{ width: "100%", height: 420 }}
        aria-label="New York City monument map"
      >
        <TileLayer
          eventHandlers={{ loading: () => setTileError(false), tileerror: () => setTileError(true) }}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {getValidMonuments(monuments).map((monument) => (
          <Marker key={monument.id} position={[monument.latitude, monument.longitude]} icon={monumentIcon} title={monument.name}>
            <Popup>{monument.name}</Popup>
          </Marker>
        ))}
        {isValidCoordinate(playerLocation) ? (
          <Marker position={[playerLocation.latitude, playerLocation.longitude]} icon={playerIcon} title="Your location">
            <Popup>Your location</Popup>
          </Marker>
        ) : null}
      </MapContainer>
      {tileError ? (
        <p role="status" style={{ color: "#9a6512", padding: "0 12px" }}>
          Map tiles could not load. Check your connection and pan or zoom to try again. Monument markers remain available.
        </p>
      ) : null}
    </div>
  );
}
