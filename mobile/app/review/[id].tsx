import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, TextInput, View } from "react-native";

import { RequireUser } from "../../src/components/RequireUser";
import { Screen } from "../../src/components/Screen";
import { Banner, Button, Card, Chip, DetailRow, Pill, SectionTitle } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { returnToMap } from "../../src/game/homeIntent";
import {
  findCapture,
  findMonument,
  findUser,
  formatRemaining,
  formatTimeAgo,
  getHold,
  getPendingQueue,
  LOCK_DURATION_MS,
  reviewFor,
} from "../../src/demo/rules";
import { demo, getDemoState, useDemoState, useNow } from "../../src/demo/store";
import type { ReviewDecision } from "../../src/demo/types";

const QUICK_REASONS: Record<ReviewDecision, string[]> = {
  approved: ["Monument clearly visible", "Matches the reference view"],
  rejected: [
    "Photo doesn't show this monument",
    "Looks like a photo of a screen or print",
    "Too blurry to verify",
    "Monument was already held",
  ],
};

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useDemoState();
  const now = useNow();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <RequireUser role="moderator">
      {(moderator) => {
        const capture = findCapture(state, id);
        const monument = capture ? findMonument(state, capture.monumentId) : undefined;
        const player = capture ? findUser(state, capture.playerId) : undefined;
        if (!capture || !monument) {
          return (
            <Screen title="Capture not found" back backTo="/?sheet=queue" backLabel="Queue">
              <Banner tone="warning">This capture no longer exists.</Banner>
            </Screen>
          );
        }

        const review = reviewFor(state, capture.id);
        const hold = getHold(state, monument.id, now);
        const outside = capture.distanceMeters > monument.captureRadiusMeters;

        const decide = (decision: ReviewDecision) => {
          setError(null);
          try {
            demo.review(capture.id, moderator.id, decision, reason);
            setReason("");
            // Read the store directly: the hook value is from before this write.
            const next = getPendingQueue(getDemoState()).find((q) => q.capture.id !== capture.id);
            if (next) router.replace(`/review/${next.capture.id}`);
            else returnToMap({ sheet: "queue" });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save the decision.");
          }
        };

        return (
          <Screen title={monument.name} subtitle={`Submitted by ${player?.name ?? "unknown player"}`} back backTo="/?sheet=queue" backLabel="Queue">
            <Image source={{ uri: capture.photoUri }} style={styles.photo} resizeMode="contain" accessibilityLabel="Submitted photo" />

            <Card>
              <DetailRow
                label="Distance at check-in"
                value={`${capture.distanceMeters} m (radius ${monument.captureRadiusMeters} m)`}
                tone={outside ? "danger" : undefined}
              />
              <DetailRow label="GPS accuracy" value={`±${capture.accuracyMeters} m`} />
              <DetailRow label="Submitted" value={capture.submittedAt ? `${new Date(capture.submittedAt).toLocaleString()} (${formatTimeAgo(now - capture.submittedAt)})` : "—"} />
              <DetailRow label="Player" value={player ? `${player.name} (${player.email})` : "Unknown"} />
              {capture.simulatedPosition ? <DetailRow label="Position source" value="Simulated (demo tool)" tone="warning" /> : null}
            </Card>

            {review ? (
              <Banner tone={review.decision === "approved" ? "success" : "danger"} title={review.decision === "approved" ? "Approved" : "Rejected"}>
                {`${review.reason ? `“${review.reason}” · ` : ""}${formatTimeAgo(now - review.reviewedAt)} by ${findUser(state, review.moderatorId)?.name ?? "a moderator"}`}
              </Banner>
            ) : (
              <>
                {hold.status === "held" ? (
                  <Banner tone="warning" title={`Already held by ${hold.holder.name}`}>
                    {`The lock has ${formatRemaining(hold.lockedUntil - now)} left, so approving will be refused. Reject it, or wait for the lock to expire.`}
                  </Banner>
                ) : (
                  <Banner tone="info">{`Approving locks ${monument.name} to ${player?.name ?? "this player"} for ${formatRemaining(LOCK_DURATION_MS)}.`}</Banner>
                )}

                <SectionTitle>Decision</SectionTitle>
                <Text style={styles.label}>Reason: required to reject, optional to approve (shown to the player)</Text>
                <TextInput
                  accessibilityLabel="Reason"
                  multiline
                  onChangeText={(t) => {
                    setReason(t);
                    setError(null);
                  }}
                  placeholder="Why are you rejecting this? (optional when approving)"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                  value={reason}
                />
                <View style={styles.chips}>
                  {[...QUICK_REASONS.approved, ...QUICK_REASONS.rejected].map((r) => (
                    <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
                  ))}
                </View>

                {error ? <Banner tone="danger">{error}</Banner> : null}

                <View style={styles.actions}>
                  <Button style={{ flex: 1 }} label="Reject" icon="close" variant="danger" onPress={() => decide("rejected")} />
                  <Button style={{ flex: 1 }} label="Approve" icon="checkmark" onPress={() => decide("approved")} />
                </View>
              </>
            )}

            <Card style={styles.row} onPress={() => returnToMap({ monumentId: monument.id })}>
              <Text style={styles.linkText}>View monument</Text>
              <Pill kind={hold.status === "held" ? "held" : "free"} />
            </Card>
          </Screen>
        );
      }}
    </RequireUser>
  );
}

const styles = StyleSheet.create({
  photo: { aspectRatio: 4 / 3, backgroundColor: "#11181c", borderRadius: theme.radius.medium, width: "100%" },
  label: { color: theme.colors.muted, marginBottom: -8 },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 80,
    padding: 12,
    textAlignVertical: "top",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.small },
  actions: { flexDirection: "row", gap: theme.spacing.small },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  linkText: { color: theme.colors.primary, fontWeight: "700" },
});
