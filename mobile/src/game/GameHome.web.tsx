// The map-first home screen (web): a full-screen Leaflet map with floating
// controls and bottom sheets, Pokémon GO style. All data comes from the demo
// store and its read-only selectors.
import { divIcon, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { NYC_REGION } from "../components/map/types";
import { getPendingQueue } from "../demo/rules";
import {
  getAreaName,
  getCaptureRingRadius,
  getEffectivePosition,
  getInitials,
  getMonumentsInRange,
  getPlayerLevel,
  monumentIcon,
} from "../demo/selectors";
import { useDemoState, useNow } from "../demo/store";
import type { User } from "../demo/types";
import { monumentViews } from "../demo/views";
import { usePlayerLocation } from "../hooks/usePlayerLocation";
import { installWebTheme } from "../theme/installWebTheme";
import { useHomeIntent, type HomeIntent } from "./homeIntent";
import { ActivitySheet, MonumentSheet, MonumentsAdminSheet, ProfileSheet, QueueSheet, RecordsSheet } from "./sheets.web";
import type { GameHomeProps, SheetId } from "./types";

const MIN_ZOOM = 13;
const MAX_ZOOM = 19;
const PLAYER_ZOOM = 17;

/** Stable 0–2 s animation delay per monument, so pins bob out of step. */
function bobDelay(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return ((h % 200) / 100).toFixed(2);
}

const playerIconCache = new Map<string, ReturnType<typeof divIcon>>();
function playerIcon(initials: string) {
  const cached = playerIconCache.get(initials);
  if (cached) return cached;
  const icon = divIcon({
    className: "",
    html: `<div class="mc-me"><div class="pulse"></div><div class="body">${initials.replace(/[<>&]/g, "")}</div></div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
  playerIconCache.set(initials, icon);
  return icon;
}

function monumentPin(kind: string, icon: string, id: string) {
  return divIcon({
    className: "",
    html: `<div class="mc-mon ${kind}" style="animation-delay:${bobDelay(id)}s"><div class="pin"></div><div class="ico">${icon}</div><div class="base"></div></div>`,
    iconSize: [44, 58],
    iconAnchor: [22, 56],
  });
}

/** Hands the Leaflet map instance up to the overlay controls. */
function MapBridge({ onMap, onZoom }: { onMap: (m: LeafletMap) => void; onZoom: (z: number) => void }) {
  const map = useMap();
  useEffect(() => onMap(map), [map, onMap]);
  useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  return null;
}

export function GameHome({ user, initialSheet, initialMonumentId, justSubmitted }: GameHomeProps) {
  useEffect(() => installWebTheme(), []);
  const state = useDemoState();
  const now = useNow(1000);
  const { location } = usePlayerLocation();
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [spin, setSpin] = useState(0);
  const [tileError, setTileError] = useState(false);
  const [sheet, setSheet] = useState<SheetId | null>(
    initialMonumentId ? { kind: "monument", id: initialMonumentId } : initialSheet ? { kind: initialSheet } : null,
  );
  // Monument whose sheet should say "✅ Submitted!" (just came back from the capture flow).
  const [submittedFor, setSubmittedFor] = useState<string | null>(justSubmitted && initialMonumentId ? initialMonumentId : null);

  // Coming back from the capture flow, a review or the editor.
  const onIntent = useCallback((i: HomeIntent) => {
    if (i.monumentId) setSheet({ kind: "monument", id: i.monumentId });
    else if (i.sheet) setSheet({ kind: i.sheet });
    else setSheet(null);
    setSubmittedFor(i.submitted && i.monumentId ? i.monumentId : null);
  }, []);
  useHomeIntent(onIntent);

  const isModerator = user.role === "moderator";
  const position = getEffectivePosition(state, location);
  const views = monumentViews(state, user.id, now);
  const inRange = getMonumentsInRange(state, position);
  const ringRadius = getCaptureRingRadius(state, position);
  const initials = getInitials(user.name);
  const level = getPlayerLevel(state, user.id);
  const pendingCount = getPendingQueue(state).length;

  const onMap = useCallback((m: LeafletMap) => {
    setMap(m);
    setZoom(m.getZoom());
  }, []);

  // Follow the player when their (real or simulated) position changes.
  const posKey = position ? `${position.latitude.toFixed(6)},${position.longitude.toFixed(6)}` : "";
  const lastPos = useRef("");
  useEffect(() => {
    if (!map || !position || posKey === lastPos.current) return;
    lastPos.current = posKey;
    map.flyTo([position.latitude, position.longitude], Math.max(map.getZoom(), PLAYER_ZOOM - 1), { duration: 0.8 });
  }, [map, posKey, position]);

  // Opening a monument from a link (e.g. after submitting) centres on it.
  useEffect(() => {
    if (!map || sheet?.kind !== "monument") return;
    const m = state.monuments.find((x) => x.id === sheet.id);
    if (m) map.flyTo([m.latitude, m.longitude], Math.max(map.getZoom(), PLAYER_ZOOM), { duration: 0.6 });
    // Only when the selected monument changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sheet?.kind === "monument" ? sheet.id : null]);

  const recenter = () => {
    setSpin((s) => s + 1);
    if (!map) return;
    if (position) map.flyTo([position.latitude, position.longitude], PLAYER_ZOOM, { duration: 0.8 });
    else map.flyTo([NYC_REGION.latitude, NYC_REGION.longitude], MIN_ZOOM, { duration: 0.8 });
  };

  const icons = useMemo(
    () => new Map(views.map((v) => [v.monument.id, monumentPin(v.kind, monumentIcon(v.monument), v.monument.id)])),
    // Pins only change when a monument's status or icon changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [views.map((v) => `${v.monument.id}:${v.kind}:${v.monument.icon}`).join("|")],
  );

  const close = () => setSheet(null);
  const open = (s: SheetId) => setSheet(s);

  return (
    <div className="mc-home" data-testid="game-home">
      <div className="mc-map">
        <MapContainer
          center={position ? [position.latitude, position.longitude] : [NYC_REGION.latitude, NYC_REGION.longitude]}
          zoom={position ? PLAYER_ZOOM - 1 : MIN_ZOOM}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          zoomControl={false}
          attributionControl
          aria-label="Monument map"
        >
          <MapBridge onMap={onMap} onZoom={setZoom} />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={MAX_ZOOM}
            attribution="&copy; OpenStreetMap &copy; CARTO"
            eventHandlers={{ tileload: () => setTileError(false), tileerror: () => setTileError(true) }}
          />
          {position && ringRadius ? (
            <Circle
              center={[position.latitude, position.longitude]}
              radius={ringRadius}
              pathOptions={{ color: "#16a37f", weight: 2, fillColor: "#16a37f", fillOpacity: 0.08, dashArray: "6 6" }}
            />
          ) : null}
          {views.map((v) => (
            <Marker
              key={v.monument.id}
              position={[v.monument.latitude, v.monument.longitude]}
              icon={icons.get(v.monument.id)!}
              title={`${v.monument.name}: ${v.statusLine}`}
              eventHandlers={{ click: () => open({ kind: "monument", id: v.monument.id }) }}
            />
          ))}
          {position ? (
            // Not interactive: taps pass through to a monument pin underneath, so a
            // player standing at a monument can still open it.
            <Marker position={[position.latitude, position.longitude]} icon={playerIcon(initials)} zIndexOffset={1000} interactive={false} keyboard={false} />
          ) : null}
        </MapContainer>
      </div>

      <div className="mc-fog top" />
      <div className="mc-fog bottom" />

      <div className="mc-status" aria-live="polite">
        <div className="dot">★</div>
        <div className="txt">
          {getAreaName(state, position)}
          <small>
            {position
              ? `${inRange.length} ${inRange.length === 1 ? "monument" : "monuments"} in range`
              : "Location off · showing all monuments"}
          </small>
        </div>
      </div>

      <button
        type="button"
        className={`mc-round mc-compass${spin ? " spin" : ""}`}
        aria-label="Recenter on me"
        onClick={recenter}
      >
        {/* Re-keyed on each tap so the one-shot spin animation restarts. */}
        <svg key={spin} width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
          <circle cx="17" cy="17" r="15" fill="#f4f8f7" stroke="#d7e3df" strokeWidth="2" />
          <polygon points="17,4 21,17 13,17" fill="#e5383b" />
          <polygon points="17,30 21,17 13,17" fill="#9fb3ad" />
          <circle cx="17" cy="17" r="2.4" fill="#17323a" />
        </svg>
      </button>
      <div className="mc-zoom">
        <button type="button" className="mc-round" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => map?.zoomIn()}>+</button>
        <button type="button" className="mc-round" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => map?.zoomOut()}>−</button>
      </div>

      {tileError ? (
        <div className="mc-status" style={{ top: "auto", bottom: 120, left: "50%", transform: "translateX(-50%)", padding: "8px 14px" }} role="status">
          Map tiles couldn't load. Markers still work.
        </div>
      ) : null}

      <nav className="mc-bar" aria-label="Main">
        <button type="button" className="mc-tab" onClick={() => open({ kind: "profile" })}>
          <div className="mc-avatar">{initials}{isModerator ? null : <span className="lvl">LV {level}</span>}</div>
          Profile
        </button>
        {isModerator ? (
          <>
            <button type="button" className="mc-tab" onClick={() => open({ kind: "queue" })}>
              <div className="mc-round" aria-hidden="true">✅</div>
              {pendingCount > 0 ? <span className="count" aria-label={`${pendingCount} waiting`}>{pendingCount}</span> : null}
              Queue
            </button>
            <button type="button" className="mc-tab" onClick={() => open({ kind: "monuments" })}>
              <div className="mc-round" aria-hidden="true">🏛️</div>
              Monuments
            </button>
          </>
        ) : (
          <>
            <button type="button" className="mc-tab" onClick={() => open({ kind: "records" })}>
              <div className="mc-round" aria-hidden="true">🏆</div>
              Records
            </button>
            <button type="button" className="mc-tab" onClick={() => open({ kind: "activity" })}>
              <div className="mc-round" aria-hidden="true">🗺️</div>
              Activity
            </button>
          </>
        )}
      </nav>

      <div className={`mc-scrim${sheet ? " on" : ""}`} onClick={close} data-testid="scrim" />

      <section className={`mc-sheet${sheet?.kind === "monument" ? " on" : ""}`} aria-label="Monument" aria-hidden={sheet?.kind !== "monument"}>
        <div className="mc-grab" />
        {sheet?.kind === "monument" ? (
          <MonumentSheet key={sheet.id} monumentId={sheet.id} user={user} realLocation={location} now={now} justSubmitted={submittedFor === sheet.id} />
        ) : null}
      </section>
      <section className={`mc-sheet${sheet?.kind === "profile" ? " on" : ""}`} aria-label="Profile" aria-hidden={sheet?.kind !== "profile"}>
        <div className="mc-grab" />
        {sheet?.kind === "profile" ? <ProfileSheet user={user} now={now} /> : null}
      </section>
      {isModerator ? (
        <>
          <section className={`mc-sheet${sheet?.kind === "queue" ? " on" : ""}`} aria-label="Queue" aria-hidden={sheet?.kind !== "queue"}>
            <div className="mc-grab" />
            {sheet?.kind === "queue" ? <QueueSheet now={now} /> : null}
          </section>
          <section className={`mc-sheet${sheet?.kind === "monuments" ? " on" : ""}`} aria-label="Monuments" aria-hidden={sheet?.kind !== "monuments"}>
            <div className="mc-grab" />
            {sheet?.kind === "monuments" ? <MonumentsAdminSheet user={user} now={now} /> : null}
          </section>
        </>
      ) : (
        <>
          <section className={`mc-sheet${sheet?.kind === "records" ? " on" : ""}`} aria-label="Records" aria-hidden={sheet?.kind !== "records"}>
            <div className="mc-grab" />
            {sheet?.kind === "records" ? <RecordsSheet user={user} now={now} /> : null}
          </section>
          <section className={`mc-sheet${sheet?.kind === "activity" ? " on" : ""}`} aria-label="Activity" aria-hidden={sheet?.kind !== "activity"}>
            <div className="mc-grab" />
            {sheet?.kind === "activity" ? <ActivitySheet user={user} now={now} onOpenMonument={(id) => open({ kind: "monument", id })} /> : null}
          </section>
        </>
      )}
    </div>
  );
}

export type { User };
