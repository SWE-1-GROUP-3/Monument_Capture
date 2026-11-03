import { useEffect, useRef, useState } from "react";
import { divIcon, type Marker as LeafletMarker } from "leaflet";
import type { MapMonument } from "../../types/mapMonument";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { MonumentActions } from "./MonumentActions";
import { getMonumentAvailability } from "../../utils/monumentAvailability";
import { availabilityAppearance, viewerHoldAppearance } from "./availabilityAppearance";

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
const monumentIcons = {
  available: pin(availabilityAppearance.available.color),
  locked: pin(availabilityAppearance.locked.color),
  unknown: pin(availabilityAppearance.unknown.color),
  mine: pin(viewerHoldAppearance.color),
};
const playerIcon = pin("#2563eb");

export function MonumentMap({ monuments, playerLocation, nowMs, onViewDetails, onStartCapture, height = 420 }: MonumentMapProps) {
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
          <MonumentMarker key={monument.id} monument={monument} nowMs={nowMs} onViewDetails={onViewDetails} onStartCapture={onStartCapture} />
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

function MonumentMarker({ monument, nowMs, onViewDetails, onStartCapture }: {
  monument: MapMonument;
  nowMs: number;
  onViewDetails?: (monumentId: string) => void;
  onStartCapture?: (monumentId: string) => void;
}) {
  const { status } = getMonumentAvailability(monument, nowMs);
  const appearance = availabilityAppearance[status];
  const accessibleName = `${monument.name}: ${appearance.label}`;
  const markerRef = useRef<LeafletMarker>(null);

  // Leaflet titles are creation options; explicitly refresh accessible text without remounting.
  useEffect(() => {
    const marker = markerRef.current;
    const updateLabel = () => {
      const element = marker?.getElement();
      element?.setAttribute("title", accessibleName);
      element?.setAttribute("aria-label", accessibleName);
    };
    updateLabel();
    marker?.on("add", updateLabel);
    return () => { marker?.off("add", updateLabel); };
  }, [accessibleName]);

  return (
    <Marker ref={markerRef} position={[monument.latitude, monument.longitude]} icon={status === "locked" && monument.hold?.heldByViewer ? monumentIcons.mine : monumentIcons[status]}
      title={accessibleName} alt={accessibleName}>
      <Popup minWidth={160} maxWidth={280}>
        <div style={{ width: "min(260px, calc(100vw - 72px))", maxWidth: "100%", display: "grid", gap: 8 }}>
          <strong style={{ overflowWrap: "anywhere", paddingRight: 8 }}>{monument.name}</strong>
          <span>{appearance.description}</span>
          {onViewDetails ? (
            <MonumentActions
              available={status === "available"}
              onViewDetails={() => onViewDetails(monument.id)}
              onStartCapture={onStartCapture ? () => onStartCapture(monument.id) : undefined}
            />
          ) : null}
        </div>
      </Popup>
    </Marker>
  );
}
