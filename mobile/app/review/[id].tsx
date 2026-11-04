import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { Banner, Button, Card, Chip, DetailRow } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { findCapture, findUser, formatTimeAgo, getPendingQueue, monumentName, reviewFor, STATUS_LABEL } from "../../src/review/captureReview";
import { getReviewState, reviews, useCurrentUser, useReviewState } from "../../src/review/reviewStore";
import type { ReviewDecision } from "../../src/review/types";

const QUICK_REASONS = [
  "Photo doesn't show this monument",
  "Looks like a photo of a screen or print",
  "Too blurry to verify",
];

// US-14: approve (reason optional) or reject (reason required), recorded and shown to the player.
export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useReviewState();
  const user = useCurrentUser();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const capture = findCapture(state, id);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/queue"));
  const backLink = (
    <Pressable accessibilityRole="link" onPress={back} style={styles.back}>
      <Ionicons color={theme.colors.primary} name="chevron-back" size={18} />
      <Text style={styles.backText}>Back to queue</Text>
    </Pressable>
  );

  if (!capture) {
    return (
      <Screen title="Capture not found">
        {backLink}
        <Banner tone="warning">This capture does not exist.</Banner>
      </Screen>
    );
  }

  const player = findUser(state, capture.playerId);
  const review = reviewFor(state, capture.id);
  const isModerator = user?.role === "moderator";

  const decide = (decision: ReviewDecision) => {
    setError(null);
    try {
      reviews.decide(capture.id, decision, reason);
      setReason("");
      const next = getPendingQueue(getReviewState()).find((q) => q.capture.id !== capture.id);
      router.replace(next ? `/review/${next.capture.id}` : "/queue");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the decision.");
    }
  };

  return (
    <Screen title={monumentName(capture.monumentId)} subtitle={`Submitted by ${player?.name ?? "unknown player"}`}>
      {backLink}
      <Image source={{ uri: capture.monumentPhotoUri }} style={styles.photo} resizeMode="contain" accessibilityLabel="Submitted monument photo" />
      <Card>
        <DetailRow label="Status" value={STATUS_LABEL[capture.status]} />
        <DetailRow label="Reported distance" value={`${capture.distanceMeters} m`} />
        <DetailRow label="Submitted" value={`${new Date(capture.submittedAt).toLocaleString()} (${formatTimeAgo(Date.now() - capture.submittedAt)})`} />
        <DetailRow label="Challenge photo" value="Not available until US-07/08" />
      </Card>

      {review ? (
        <Banner tone={review.decision === "approved" ? "success" : "danger"} title={review.decision === "approved" ? "Approved" : "Rejected"}>
          {`${review.reason ? `“${review.reason}” · ` : ""}${formatTimeAgo(Date.now() - review.reviewedAt)} by ${findUser(state, review.moderatorId)?.name ?? "a moderator"}`}
        </Banner>
      ) : !isModerator ? (
        <Banner tone="warning">Only moderators can approve or reject captures.</Banner>
      ) : (
        <>
          <Text style={styles.label}>Reason: required to reject, optional to approve. The player will see it.</Text>
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
            {QUICK_REASONS.map((r) => (
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 2, marginTop: -12 },
  backText: { color: theme.colors.primary, fontSize: 15, fontWeight: "700" },
  photo: { aspectRatio: 4 / 3, backgroundColor: "#11181c", borderRadius: theme.radius.medium, width: "100%" },
  label: { color: theme.colors.muted, marginBottom: -8 },
  input: {
    backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 10, borderWidth: 1,
    color: theme.colors.text, fontSize: 16, minHeight: 80, padding: 12, textAlignVertical: "top",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.small },
  actions: { flexDirection: "row", gap: theme.spacing.small },
});
