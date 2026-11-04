import { router } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/Screen";
import { Banner, Card, EmptyState } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { formatTimeAgo, getPendingQueue, monumentName } from "../../src/review/captureReview";
import { useCurrentUser, useReviewState } from "../../src/review/reviewStore";

// US-13: moderators review pending captures, oldest first.
export default function QueueScreen() {
  const state = useReviewState();
  const user = useCurrentUser();

  if (user?.role !== "moderator") {
    return (
      <Screen title="Moderation queue">
        <Banner tone="danger" title="Access denied">Only moderators can open the moderation queue.</Banner>
      </Screen>
    );
  }

  const queue = getPendingQueue(state);
  const now = Date.now();

  return (
    <Screen title="Moderation queue" subtitle="Oldest first. Open a capture to approve or reject it.">
      {queue.length === 0 ? (
        <Card>
          <EmptyState icon="checkmark-done" title="No captures waiting for review" body="New submissions appear here as players send them." />
        </Card>
      ) : (
        queue.map(({ capture, player }) => (
          <Card key={capture.id} onPress={() => router.push(`/review/${capture.id}`)} style={styles.row}>
            <Image source={{ uri: capture.monumentPhotoUri }} style={styles.thumb} accessibilityLabel={`Photo of ${monumentName(capture.monumentId)}`} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.title}>{monumentName(capture.monumentId)}</Text>
              <Text style={styles.meta}>{player?.name ?? "Unknown player"}</Text>
              <Text style={styles.meta}>Reported distance: {capture.distanceMeters} m</Text>
              <Text style={styles.meta}>Submitted {new Date(capture.submittedAt).toLocaleString()} ({formatTimeAgo(now - capture.submittedAt)})</Text>
            </View>
          </Card>
        ))
      )}
      <Text style={styles.note}>Challenge photo and target will appear here once the challenge step (US-07, US-08) is merged.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-start", flexDirection: "row", gap: theme.spacing.medium },
  thumb: { backgroundColor: theme.colors.primarySoft, borderRadius: 10, height: 80, width: 80 },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },
  meta: { color: theme.colors.muted },
  note: { color: theme.colors.muted, fontSize: 13, lineHeight: 19 },
});
