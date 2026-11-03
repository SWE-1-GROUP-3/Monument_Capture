import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { Banner, Button, Card, DetailRow, Pill, SectionTitle } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { pickPhoto, type PhotoSource } from "../../src/demo/photo";
import { findMonument, getInProgressCapture } from "../../src/demo/rules";
import { demo, useCurrentUser, useDemoState, useNow } from "../../src/demo/store";
import type { Capture, Monument, User } from "../../src/demo/types";
import { monumentView, monumentViews } from "../../src/demo/views";
import type { CaptureCheckState } from "../../src/features/capture/types";
import { useCaptureEligibility } from "../../src/features/capture/useCaptureEligibility";

const statusIcon = {
  idle: "location-outline",
  checking: "locate-outline",
  eligible: "checkmark-circle-outline",
  outside: "walk-outline",
  inaccurate: "refresh-outline",
  locked: "lock-closed-outline",
  duplicate: "hourglass-outline",
  inactive: "ban-outline",
  "permission-denied": "lock-closed-outline",
  unavailable: "warning-outline",
} as const;

export default function CaptureScreen() {
  const user = useCurrentUser();
  const state = useDemoState();
  const { monumentId } = useLocalSearchParams<{ monumentId?: string }>();
  const [submitted, setSubmitted] = useState<{ monumentName: string } | null>(null);

  if (!user) return null;
  if (user.role !== "player") {
    return (
      <Screen title="Capture">
        <Banner tone="warning">Only players capture monuments. Switch to a player account from Profile.</Banner>
      </Screen>
    );
  }

  const inProgress = getInProgressCapture(state, user.id);
  const inProgressMonument = inProgress ? findMonument(state, inProgress.monumentId) : undefined;

  if (submitted) {
    return (
      <SubmittedStep
        monumentName={submitted.monumentName}
        onAnother={() => {
          setSubmitted(null);
          router.setParams({ monumentId: "" });
        }}
      />
    );
  }
  if (inProgress && inProgressMonument) {
    return (
      <PhotoStep
        capture={inProgress}
        monument={inProgressMonument}
        onSubmitted={() => setSubmitted({ monumentName: inProgressMonument.name })}
      />
    );
  }
  const selected = findMonument(state, monumentId);
  if (selected) return <CheckStep monument={selected} user={user} />;
  return <PickStep user={user} />;
}

// ---------- Step 1: choose a monument ----------

function PickStep({ user }: { user: User }) {
  const state = useDemoState();
  const now = useNow(5000);
  const views = monumentViews(state, user.id, now).sort((a, b) => order[a.kind] - order[b.kind]);
  return (
    <Screen title="Start a capture" subtitle="Pick the monument you are standing at. Held monuments unlock when their timer runs out.">
      {views.map((v) => (
        <Card
          key={v.monument.id}
          onPress={v.kind === "free" ? () => router.setParams({ monumentId: v.monument.id }) : () => router.push(`/monument/${v.monument.id}`)}
          style={styles.row}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{v.monument.name}</Text>
            <Text style={styles.rowMeta}>{v.monument.neighborhood} · {v.statusLine}</Text>
          </View>
          <Pill kind={v.kind} />
        </Card>
      ))}
    </Screen>
  );
}
const order = { free: 0, held: 1, mine: 2, inactive: 3 } as const;

// ---------- Step 2: proximity check ----------

function CheckStep({ monument, user }: { monument: Monument; user: User }) {
  const state = useDemoState();
  const now = useNow();
  const { state: check, verify, reset, checked } = useCaptureEligibility(monument.id, user.id);
  const [error, setError] = useState<string | null>(null);
  const view = monumentView(state, monument, user.id, now);
  const sim = state.settings.location;
  const isChecking = check.status === "checking";
  const isEligible = check.status === "eligible" && checked;

  const start = () => {
    if (!checked) return;
    try {
      demo.startCapture(monument.id, user.id, checked.position, checked.simulated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the capture.");
      reset();
    }
  };

  const teleport = (accuracyMeters: number) => {
    demo.teleportTo(monument, accuracyMeters);
    reset();
  };

  return (
    <Screen title="Check in" subtitle="We confirm you're within the monument's capture radius before you take the photo." back backTo="/capture">
      <Card style={styles.monumentCard}>
        <View style={styles.monumentIcon}>
          <Ionicons color={theme.colors.primary} name="location" size={26} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.eyebrow}>SELECTED MONUMENT</Text>
          <Text style={styles.monumentName}>{monument.name}</Text>
          <Text style={styles.rowMeta}>Capture radius {monument.captureRadiusMeters} m · {view.statusLine}</Text>
        </View>
      </Card>

      <View accessibilityLiveRegion="polite" style={[styles.statusCard, check.status === "eligible" && styles.eligibleCard]}>
        <Ionicons
          color={check.status === "eligible" ? theme.colors.primary : check.status === "idle" || isChecking ? theme.colors.muted : theme.colors.warning}
          name={statusIcon[check.status]}
          size={28}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>{statusTitle(check.status)}</Text>
          <Text style={styles.statusMessage}>{check.message}</Text>
        </View>
      </View>

      {error ? <Banner tone="danger">{error}</Banner> : null}

      {isEligible ? (
        <Button label="Start capture" icon="camera" onPress={start} />
      ) : (
        <Button
          label={isChecking ? "Checking location…" : check.status === "idle" ? "Check my location" : "Check again"}
          icon="navigate"
          onPress={() => {
            setError(null);
            void verify();
          }}
          disabled={isChecking}
        />
      )}

      <Card style={styles.demoCard}>
        <Text style={styles.demoLabel}>DEMO LOCATION</Text>
        <Text style={styles.statusMessage}>
          {sim.mode === "simulated"
            ? `Using a simulated position ${sim.label} (±${sim.accuracyMeters} m).`
            : "Using your real GPS. Indoors or on a laptop this is usually too inaccurate to pass."}
        </Text>
        <View style={styles.demoButtons}>
          <Button compact variant="ghost" icon="locate" label="Teleport here" onPress={() => teleport(8)} />
          <Button compact variant="ghost" icon="cellular-outline" label="Here, poor GPS" onPress={() => teleport(120)} />
          {sim.mode === "simulated" ? (
            <Button compact variant="ghost" icon="navigate-outline" label="Use real GPS" onPress={() => { demo.setLocation({ mode: "real" }); reset(); }} />
          ) : null}
        </View>
      </Card>
    </Screen>
  );
}

function statusTitle(status: CaptureCheckState["status"]) {
  switch (status) {
    case "eligible": return "You're in range";
    case "outside": return "Too far away";
    case "inaccurate": return "Location not accurate enough";
    case "locked": return "Monument is locked";
    case "duplicate": return "Already submitted";
    case "inactive": return "Not available";
    case "permission-denied": return "Location permission needed";
    case "unavailable": return "Location unavailable";
    case "checking": return "Checking…";
    default: return "Ready to check in";
  }
}

// ---------- Step 3: photo ----------

function PhotoStep({ capture, monument, onSubmitted }: { capture: Capture; monument: Monument; onSubmitted: () => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (source: PhotoSource) => {
    setError(null);
    setBusy(true);
    try {
      const uri = await pickPhoto(source);
      if (uri) setPhoto(uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the camera.");
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!photo) return;
    try {
      demo.submitPhoto(capture.id, photo);
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit the capture.");
    }
  };

  return (
    <Screen title="Photograph the monument" subtitle={`You're checked in at ${monument.name}. Take one clear photo with the whole monument in frame.`}>
      <Card>
        <DetailRow label="Distance at check-in" value={`${capture.distanceMeters} m of ${monument.captureRadiusMeters} m`} />
        <DetailRow label="GPS accuracy" value={`±${capture.accuracyMeters} m`} />
        {capture.simulatedPosition ? <DetailRow label="Position source" value="Simulated (demo)" tone="warning" /> : null}
      </Card>

      {photo ? (
        <Image accessibilityLabel="Your monument photo" source={{ uri: photo }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons color={theme.colors.primary} name="camera-outline" size={54} />
          <Text style={styles.statusTitle}>No photo yet</Text>
          <Text style={[styles.statusMessage, { textAlign: "center" }]}>On a phone this opens the camera. On a laptop it opens a file picker.</Text>
        </View>
      )}

      {error ? <Banner tone="danger">{error}</Banner> : null}

      <View style={styles.photoButtons}>
        <Button style={{ flex: 1 }} label={photo ? "Retake" : "Take photo"} icon="camera" variant={photo ? "secondary" : "primary"} onPress={() => void choose("camera")} disabled={busy} />
        <Button style={{ flex: 1 }} label="Upload" icon="image-outline" variant="secondary" onPress={() => void choose("library")} disabled={busy} />
      </View>
      <Button label="Submit for review" icon="send" onPress={submit} disabled={!photo || busy} />
      <Button label="Cancel capture" variant="ghost" onPress={() => demo.cancelCapture(capture.id)} />
    </Screen>
  );
}

// ---------- Step 4: done ----------

function SubmittedStep({ monumentName, onAnother }: { monumentName: string; onAnother: () => void }) {
  return (
    <Screen title="Sent for review">
      <Banner tone="success" title={`${monumentName} is in the queue`}>
        A moderator will check your photo. If it's approved, the monument is locked to you for one hour.
      </Banner>
      <SectionTitle>What next?</SectionTitle>
      <Button label="See my activity" icon="time" onPress={() => router.replace("/activity")} />
      <Button label="Capture another" icon="camera" variant="secondary" onPress={onAnother} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: theme.spacing.medium },
  rowTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },
  rowMeta: { color: theme.colors.muted, marginTop: 2 },
  monumentCard: { alignItems: "center", flexDirection: "row", gap: theme.spacing.medium },
  monumentIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  monumentName: { color: theme.colors.text, fontSize: 20, fontWeight: "800" },
  statusCard: {
    alignItems: "flex-start",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.medium,
    padding: theme.spacing.medium,
  },
  eligibleCard: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  statusTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "800" },
  statusMessage: { color: theme.colors.muted, lineHeight: 20, marginTop: 2 },
  demoCard: { borderStyle: "dashed" },
  demoLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  demoButtons: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.small },
  preview: { aspectRatio: 4 / 3, borderRadius: theme.radius.medium, width: "100%" },
  placeholder: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.large,
    gap: 6,
    justifyContent: "center",
    minHeight: 220,
    padding: theme.spacing.large,
  },
  photoButtons: { flexDirection: "row", gap: theme.spacing.small },
});
