// Bottom-sheet contents for the map home (web). Every value shown comes from
// the demo store, its rules or the read-only selectors.
import { router } from "expo-router";
import { useEffect, useState } from "react";

import { DemoTools } from "../components/DemoTools";
import { LOCK_DURATION_MS, findMonument, formatTimeAgo, getHistoryFor, getHoldingsFor, getPendingQueue, getPlayerStats, getHold } from "../demo/rules";
import { getCapturePosition, type PositionResult } from "../demo/location";
import {
  distanceTo,
  formatDay,
  formatDuration,
  formatMonthYear,
  getEffectivePosition,
  getHolderLabel,
  getInitials,
  getLocationLabel,
  getPendingCaptureFor,
  getPlayerLevel,
  getPlayerRecords,
  getRecordLine,
  getRecordTotals,
  monumentIcon,
  sortRecords,
  type RecordSort,
} from "../demo/selectors";
import { demo, useDemoState } from "../demo/store";
import type { User } from "../demo/types";
import { monumentView, monumentViews } from "../demo/views";
import type { CaptureCheck } from "../demo/rules";
import { formatLockTime } from "../utils/formatLockTime";

type LatLng = { latitude: number; longitude: number };

const STATUS_PILL = {
  free: { label: "Free to claim", color: "#2f80ed" },
  held: { label: "Held", color: "#e8590c" },
  mine: { label: "Yours", color: "#7c3aed" },
  inactive: { label: "Not in play", color: "#9fb3ad" },
} as const;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mc-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="mc-empty">
      <b>{title}</b>
      {body}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monument
// ---------------------------------------------------------------------------

type Eligibility =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "result"; check: CaptureCheck; position: Extract<PositionResult, { ok: true }> }
  | { kind: "no-position"; message: string };

export function MonumentSheet({ monumentId, user, realLocation, now, justSubmitted }: {
  monumentId: string;
  user: User;
  realLocation: LatLng | null;
  now: number;
  justSubmitted: boolean;
}) {
  const state = useDemoState();
  const monument = findMonument(state, monumentId);
  const [elig, setElig] = useState<Eligibility>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);

  const isPlayer = user.role === "player";
  const view = monument ? monumentView(state, monument, user.id, now) : null;
  const pending = monument ? getPendingCaptureFor(state, user.id, monument.id) : undefined;
  const loc = state.settings.location;
  const locKey = JSON.stringify(loc);
  const needsCheck = isPlayer && !!view && view.kind === "free" && !pending;

  // Run the existing capture checks (accuracy → distance → lock) whenever the
  // monument, the player's position source or the monument's status changes.
  useEffect(() => {
    if (!monument || !needsCheck) {
      setElig({ kind: "idle" });
      return;
    }
    let live = true;
    setElig({ kind: "checking" });
    void getCapturePosition().then((pos) => {
      if (!live) return;
      if (!pos.ok) {
        setElig({ kind: "no-position", message: pos.message });
        return;
      }
      setElig({ kind: "result", position: pos, check: demo.checkEligibility(monument.id, user.id, pos.position) });
    });
    return () => {
      live = false;
    };
  }, [monument?.id, needsCheck, locKey, user.id, monument]);

  if (!monument || !view) return <Empty title="Monument not found" body="It may have been removed." />;

  const position = getEffectivePosition(state, realLocation);
  const fromCheck = elig.kind === "result" ? elig.position.position : null;
  const distance = position ? distanceTo(position, monument) : fromCheck ? distanceTo(fromCheck, monument) : null;
  const hold = getHold(state, monument.id, now);
  const pill = STATUS_PILL[view.kind];

  // Button and hint for every state in the brief.
  let cta = "📷 Capture";
  let enabled = false;
  let hint = "";
  if (!isPlayer) {
    cta = "Edit monument";
    enabled = true;
    hint = "Moderators manage monuments; players capture them.";
  } else if (view.kind === "inactive") {
    cta = "Not in play";
    hint = "A moderator has taken this monument out of the game.";
  } else if (view.kind === "mine") {
    cta = "You hold this";
    hint = "Defend it until the lock runs out.";
  } else if (view.kind === "held") {
    cta = "Locked";
    hint = "You can challenge it when the lock ends.";
  } else if (pending) {
    cta = "Waiting for review.";
    hint = justSubmitted ? "✅ Submitted! Waiting for moderator review." : `Submitted ${formatTimeAgo(now - (pending.submittedAt ?? now))}. A moderator will review it soon.`;
  } else if (elig.kind === "checking" || elig.kind === "idle") {
    hint = "Checking your location…";
  } else if (elig.kind === "no-position") {
    hint = elig.message;
  } else if (elig.check.ok) {
    enabled = true;
    hint = "You're in range. Take a photo to submit.";
  } else if (elig.check.code === "outside" && elig.check.distanceMeters !== undefined) {
    hint = `Move ${Math.max(1, elig.check.distanceMeters - monument.captureRadiusMeters)} m closer to capture.`;
  } else {
    hint = elig.check.message;
  }

  const onCta = () => {
    setError(null);
    if (!isPlayer) {
      router.push(`/manage-monument/${monument.id}`);
      return;
    }
    if (elig.kind !== "result" || !elig.check.ok) return;
    try {
      demo.startCapture(monument.id, user.id, elig.position.position, elig.position.simulated);
      router.push("/capture");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the capture.");
    }
  };

  const canTeleport = isPlayer && view.kind === "free" && !pending && !(loc.mode === "simulated" && loc.monumentId === monument.id);

  return (
    <div>
      <h2>{monumentIcon(monument)} {monument.name}</h2>
      <div className="mc-sub">
        {distance !== null ? `${distance.toLocaleString()} m away` : "Distance unknown"} · {monument.neighborhood}
      </div>
      <span className="mc-pill" style={{ background: pill.color }}>{pill.label}</span>
      <div className="mc-rows">
        <Row label="Held by" value={getHolderLabel(state, monument.id, user.id, now)} />
        {hold.status === "held" ? <Row label="Lock ends in" value={formatLockTime(hold.lockedUntil - now)} /> : null}
        <Row label="Capture radius" value={`${monument.captureRadiusMeters} m`} />
        {isPlayer ? <Row label="Your record" value={getRecordLine(state, user.id, monument.id, now)} /> : null}
        {pending ? <Row label="Your capture" value={`⏳ Pending review · ${formatTimeAgo(now - (pending.submittedAt ?? now))}`} /> : null}
      </div>
      <button type="button" className="mc-cta" disabled={!enabled} onClick={onCta}>{cta}</button>
      <div className="mc-hint" aria-live="polite">{error ?? hint}</div>
      {canTeleport ? (
        <div className="mc-hint">
          <button type="button" className="mc-small-btn" onClick={() => demo.teleportTo(monument)}>📍 Teleport here (demo)</button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function ProfileSheet({ user, now }: { user: User; now: number }) {
  const state = useDemoState();
  const isModerator = user.role === "moderator";
  const stats = getPlayerStats(state, user.id, now);
  const level = getPlayerLevel(state, user.id);
  const tiles = isModerator
    ? [
        { value: getPendingQueue(state).length, label: "Waiting" },
        { value: state.reviews.filter((r) => r.moderatorId === user.id).length, label: "Reviewed" },
        { value: state.monuments.filter((m) => m.active).length, label: "Monuments" },
      ]
    : [
        { value: stats.holding, label: "Holding" },
        { value: stats.approved, label: "Captures" },
        { value: stats.pending, label: "Pending" },
      ];

  return (
    <div>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div className="mc-avatar">
          {getInitials(user.name)}
          {isModerator ? null : <span className="lvl">LV {level}</span>}
        </div>
        <div>
          <h2>{user.name}</h2>
          <div className="mc-sub">{isModerator ? "Moderator" : "Explorer"} · joined {formatMonthYear(user.joinedAt ?? null)}</div>
        </div>
      </div>
      <div className="mc-stats">
        {tiles.map((t) => (
          <div className="mc-stat" key={t.label}><b>{t.value}</b><span>{t.label}</span></div>
        ))}
      </div>
      <div className="mc-rows">
        <Row label="Role" value={isModerator ? "Moderator" : "Player"} />
        <Row label="Email" value={user.email} />
        <Row label="Location" value={getLocationLabel(state)} />
      </div>

      <div className="mc-section">Switch account (demo)</div>
      <div className="mc-sort" style={{ marginTop: 0 }}>
        {state.users.map((u) => (
          <button key={u.id} type="button" className={`mc-small-btn${u.id === user.id ? " on" : ""}`} onClick={() => demo.switchUser(u.id)}>
            {u.name.split(" ")[0]} · {u.role === "moderator" ? "Mod" : "Player"}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <DemoTools />
      </div>

      <button
        type="button"
        className="mc-cta dark"
        style={{ marginTop: 18 }}
        onClick={() => {
          demo.logout();
          router.replace("/login");
        }}
      >
        Sign out
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export function ActivitySheet({ user, now, onOpenMonument }: { user: User; now: number; onOpenMonument: (id: string) => void }) {
  const state = useDemoState();
  const [tab, setTab] = useState<"hold" | "hist">("hold");
  const holdings = getHoldingsFor(state, user.id, now);
  const history = getHistoryFor(state, user.id);

  return (
    <div>
      <h2>Activity</h2>
      <div className="mc-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "hold"} className={tab === "hold" ? "on" : ""} onClick={() => setTab("hold")}>Holdings</button>
        <button type="button" role="tab" aria-selected={tab === "hist"} className={tab === "hist" ? "on" : ""} onClick={() => setTab("hist")}>History</button>
      </div>
      {tab === "hold" ? (
        holdings.length === 0 ? (
          <Empty title="No monuments held" body="Approved captures lock a monument to you for one hour." />
        ) : (
          <ul className="mc-list">
            {holdings.map(({ monument, hold }) => (
              <li key={monument.id} className="tap" onClick={() => onOpenMonument(monument.id)}>
                <div className="ic" style={{ background: "#f1eafe" }}>{monumentIcon(monument)}</div>
                <div><b>{monument.name}</b><small>Lock ends in {formatLockTime(hold.lockedUntil - now)}</small></div>
                <span className="go">›</span>
              </li>
            ))}
          </ul>
        )
      ) : history.length === 0 ? (
        <Empty title="No captures yet" body="Submitted captures and moderator decisions will appear here." />
      ) : (
        <ul className="mc-list">
          {history.map(({ capture, monument, review }) => {
            const s = capture.status === "pending"
              ? { ic: "⏳", bg: "#fff4d6", line: `Pending review · ${formatTimeAgo(now - (capture.submittedAt ?? now))}` }
              : capture.status === "approved"
                ? { ic: "✅", bg: "#e3f6ee", line: `Approved · ${formatDay(review?.reviewedAt ?? null, now)}` }
                : { ic: "❌", bg: "#fde8e8", line: `Rejected · ${review?.reason || "no reason given"}` };
            return (
              <li key={capture.id}>
                <div className="ic" style={{ background: s.bg }}>{s.ic}</div>
                <div><b>{monument?.name ?? "Removed monument"}</b><small>{s.line}</small></div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

function hoursLabel(ms: number) {
  const h = ms / 3_600_000;
  return `${h >= 10 ? Math.round(h) : Math.round(h * 10) / 10}h`;
}

export function RecordsSheet({ user, now }: { user: User; now: number }) {
  const state = useDemoState();
  const [sort, setSort] = useState<RecordSort>("holds");
  const [openId, setOpenId] = useState<string | null>(null);
  const records = sortRecords(getPlayerRecords(state, user.id, now, LOCK_DURATION_MS), sort);
  const totals = getRecordTotals(state, user.id, now);
  const maxMs = Math.max(1, ...records.map((r) => r.totalHeldMs));

  return (
    <div>
      <h2>Records</h2>
      <div className="mc-sub">Your all-time stats for every monument you've touched</div>
      <div className="mc-stats">
        <div className="mc-stat"><b>{totals.timesHeld}</b><span>Times held</span></div>
        <div className="mc-stat"><b>{hoursLabel(totals.totalHeldMs)}</b><span>Total hold time</span></div>
        <div className="mc-stat"><b>{Math.round(totals.approvalRate * 100)}%</b><span>Approval rate</span></div>
      </div>
      {records.length === 0 ? (
        <Empty title="No records yet." body="Capture a monument to start your first record." />
      ) : (
        <>
          <div className="mc-sort">
            {([["holds", "Most held"], ["time", "Longest held"], ["recent", "Recent"]] as const).map(([key, label]) => (
              <button key={key} type="button" className={`mc-small-btn${sort === key ? " on" : ""}`} onClick={() => setSort(key)}>{label}</button>
            ))}
          </div>
          {records.map((r) => {
            const open = openId === r.monument.id;
            return (
              <button
                key={r.monument.id}
                type="button"
                className={`mc-rec${open ? " open" : ""}`}
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : r.monument.id)}
              >
                <div className="mc-rec-head">
                  <div className="ic">{monumentIcon(r.monument)}</div>
                  <div>
                    <b>{r.monument.name}</b>
                    <small>Last held: {r.holdingNow ? "Now" : formatDay(r.lastHeldAt, now)}</small>
                  </div>
                  <div className="mc-rec-count"><b>{r.holds}</b><span>{r.holds === 1 ? "time" : "times"} held</span></div>
                </div>
                <div className="mc-bar-track"><div className="mc-bar-fill" style={{ width: `${Math.round((r.totalHeldMs / maxMs) * 100)}%` }} /></div>
                {r.badges.length ? (
                  <div className="mc-badges">{r.badges.map((b) => <span key={b} className="mc-badge">{b}</span>)}</div>
                ) : null}
                <div className="mc-rec-body">
                  <div className="mc-rec-grid">
                    <div><span>Total time held</span><b>{formatDuration(r.totalHeldMs)}</b></div>
                    <div><span>Longest single hold</span><b>{r.holds ? formatDuration(r.longestHoldMs) : "—"}</b></div>
                    <div><span>Capture attempts</span><b>{r.attempts}</b></div>
                    <div><span>Approved</span><b>{r.approved} of {r.attempts} ({Math.round(r.approvalRate * 100)}%)</b></div>
                    <div><span>First captured</span><b>{formatDay(r.firstCapturedAt, now)}</b></div>
                    <div><span>Last held</span><b>{r.holdingNow ? "Now" : formatDay(r.lastHeldAt, now)}</b></div>
                  </div>
                </div>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Moderator: queue and monuments
// ---------------------------------------------------------------------------

export function QueueSheet({ now }: { now: number }) {
  const state = useDemoState();
  const queue = getPendingQueue(state);
  return (
    <div>
      <h2>Review queue</h2>
      <div className="mc-sub">Oldest first. Open a capture to approve or reject it.</div>
      {queue.length === 0 ? (
        <Empty title="Queue is clear" body="New captures appear here as players submit them." />
      ) : (
        <ul className="mc-list">
          {queue.map(({ capture, monument, player }) => {
            const held = monument ? getHold(state, monument.id, now) : null;
            return (
              <li key={capture.id} className="tap" onClick={() => router.push(`/review/${capture.id}`)}>
                <div className="ic"><img src={capture.photoUri} alt="" /></div>
                <div>
                  <b>{monumentIcon(monument)} {monument?.name ?? "Unknown monument"}</b>
                  <small>{player?.name ?? "Unknown player"} · {capture.distanceMeters} m · {formatTimeAgo(now - (capture.submittedAt ?? now))}</small>
                  {held?.status === "held" ? <small style={{ color: "#e8590c" }}>Now held by {held.holder.name}</small> : null}
                  {capture.simulatedPosition ? <small>Simulated location</small> : null}
                </div>
                <span className="go">›</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function MonumentsAdminSheet({ user, now }: { user: User; now: number }) {
  const state = useDemoState();
  const views = monumentViews(state, user.id, now, true).sort((a, b) => Number(b.monument.active) - Number(a.monument.active));
  return (
    <div>
      <h2>Monuments</h2>
      <div className="mc-sub">{views.filter((v) => v.monument.active).length} active · deactivated ones leave the map but keep their history</div>
      <button type="button" className="mc-cta" style={{ marginTop: 14 }} onClick={() => router.push("/manage-monument/new")}>＋ Add monument</button>
      <ul className="mc-list">
        {views.map(({ monument, statusLine }) => (
          <li key={monument.id}>
            <div className="ic">{monumentIcon(monument)}</div>
            <div style={{ minWidth: 0 }}>
              <b style={monument.active ? undefined : { color: "#5d7780" }}>{monument.name}</b>
              <small>{monument.neighborhood} · {monument.captureRadiusMeters} m · {statusLine}</small>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, flex: "none" }}>
              <button type="button" className="mc-small-btn" onClick={() => router.push(`/manage-monument/${monument.id}`)}>Edit</button>
              <button type="button" className="mc-small-btn" onClick={() => demo.setMonumentActive(monument.id, !monument.active)}>
                {monument.active ? "Hide" : "Show"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

