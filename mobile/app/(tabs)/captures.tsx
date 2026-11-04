import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { Banner, Button, Card, EmptyState, StatusPill } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { findUser, formatTimeAgo, getCapturesFor, monumentName } from "../../src/review/captureReview";
import { reviews, useCurrentUser, useReviewState } from "../../src/review/reviewStore";

// US-09 Pending Review, US-10 Approved, US-11 Rejected with reason: the player's view.
export default function MyCapturesScreen() {
  const state = useReviewState();
  const user = useCurrentUser();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  if (!user) return null;
  if (user.role !== "player") {
    return (
      <Screen title="My captures">
        <Banner tone="warning">Only players have captures. Switch to a player in Profile.</Banner>
      </Screen>
    );
  }

  const captures = getCapturesFor(state, user.id);
  const now = Date.now();

  const submit = (fail: boolean) => {
    try {
      reviews.submitTest({ fail });
      setNotice({ tone: "success", text: "Submission received. It is now Pending Review." });
    } catch (e) {
      setNotice({ tone: "danger", text: e instanceof Error ? e.message : "Your submission was not received." });
    }
  };

  return (
    <Screen title="My captures" subtitle="Every capture you've submitted and where it is in review.">
      {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}

      {captures.length === 0 ? (
        <Card>
          <EmptyState icon="camera-outline" title="No captures yet" body="Submitted captures and moderator decisions will appear here." />
        </Card>
      ) : (
        captures.map(({ capture, review }) => (
          <Card key={capture.id} style={styles.row}>
            <Image source={{ uri: capture.monumentPhotoUri }} style={styles.thumb} accessibilityLabel="Monument photo" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.title}>{monumentName(capture.monumentId)}</Text>
              <Text style={styles.meta}>Submitted {formatTimeAgo(now - capture.submittedAt)}</Text>
              <StatusPill status={capture.status} />
              {capture.status === "pending" ? (
                <Text style={styles.meta}>Waiting for a moderator. This stays Pending Review until a decision is recorded.</Text>
              ) : null}
              {review?.decision === "rejected" ? (
                <Text style={[styles.reason, { color: theme.colors.danger }]}>Reason: “{review.reason}”</Text>
              ) : null}
              {review?.decision === "approved" && review.reason ? (
                <Text style={styles.reason}>Moderator: “{review.reason}”</Text>
              ) : null}
              {review ? (
                <Text style={styles.meta}>Reviewed by {findUser(state, review.moderatorId)?.name ?? "a moderator"} {formatTimeAgo(now - review.reviewedAt)}</Text>
              ) : null}
            </View>
          </Card>
        ))
      )}

      <Card style={styles.standIn}>
        <Text style={styles.standInLabel}>TEST SUBMISSION</Text>
        <Text style={styles.meta}>
          Stand-in for the capture flow (US-05 to US-08) until it is merged. Submits a sample capture of Washington Square Arch.
        </Text>
        <Button label="Submit a test capture" icon="send" onPress={() => submit(false)} />
        <Button label="Simulate a failed submission" icon="cloud-offline-outline" variant="ghost" onPress={() => submit(true)} />
      </Card>
      <Button label="Open the queue as a moderator" icon="swap-horizontal" variant="ghost" onPress={() => router.push("/profile")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-start", flexDirection: "row", gap: theme.spacing.medium },
  thumb: { backgroundColor: theme.colors.primarySoft, borderRadius: 10, height: 64, width: 64 },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },
  meta: { color: theme.colors.muted, lineHeight: 20 },
  reason: { color: theme.colors.text, fontStyle: "italic", lineHeight: 20 },
  standIn: { borderStyle: "dashed" },
  standInLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
});
