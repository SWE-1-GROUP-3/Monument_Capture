import { useState } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { getValidMonuments, isValidCoordinate } from "../../utils/mapData";

import { MARKER_COLORS, NYC_REGION, type MonumentMapProps } from "./types";

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
const icons = {
  free: pin(MARKER_COLORS.free),
  held: pin(MARKER_COLORS.held),
  mine: pin(MARKER_COLORS.mine),
};
const playerIcon = pin(MARKER_COLORS.player);

export function MonumentMap({ monuments, playerLocation, onSelect, height = 420 }: MonumentMapProps) {
  const [tileError, setTileError] = useState(false);
  return (
    <div>
      <MapContainer
        center={[NYC_REGION.latitude, NYC_REGION.longitude]}
        zoom={11}
        style={{ width: "100%", height }}
        aria-label="New York City monument map"
      >
        <TileLayer
          eventHandlers={{ loading: () => setTileError(false), tileerror: () => setTileError(true) }}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {getValidMonuments(monuments).map((monument) => (
          <Marker key={monument.id} position={[monument.latitude, monument.longitude]} icon={icons[monument.status ?? "free"] ?? icons.free} title={monument.name}>
            <Popup>
              {monument.subtitle || onSelect ? (
                <div style={{ display: "grid", gap: 4, minWidth: 160 }}>
                  <strong>{monument.name}</strong>
                  {monument.subtitle ? <span style={{ color: "#66756a" }}>{monument.subtitle}</span> : null}
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(monument.id)}
                      style={{ marginTop: 4, padding: "6px 10px", border: 0, borderRadius: 8, background: "#176b47", color: "white", fontWeight: 700, cursor: "pointer" }}
                    >
                      View details
                    </button>
                  ) : null}
                </div>
              ) : monument.name}
            </Popup>
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
