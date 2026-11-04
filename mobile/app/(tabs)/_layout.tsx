import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { theme } from "../../src/constants/theme";
import { getPendingQueue } from "../../src/review/captureReview";
import { useCurrentUser, useReviewState } from "../../src/review/reviewStore";

type IconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => {
    const iconColor = typeof color === "string" ? color : theme.colors.muted;
    return <Ionicons color={iconColor} name={name} size={size} />;
  };
}

export default function TabLayout() {
  const user = useCurrentUser();
  const pendingCount = getPendingQueue(useReviewState()).length;
  const isModerator = user?.role === "moderator";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          borderTopColor: theme.colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: tabIcon("home-outline") }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: "Explore", tabBarIcon: tabIcon("map-outline") }}
      />
      <Tabs.Screen
        name="capture"
        options={{ title: "Capture", tabBarIcon: tabIcon("camera-outline") }}
      />
      <Tabs.Screen
        name="captures"
        options={{ title: "My captures", tabBarIcon: tabIcon("time-outline"), href: isModerator ? null : undefined }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: "Queue",
          tabBarIcon: tabIcon("checkmark-done-outline"),
          tabBarBadge: isModerator && pendingCount > 0 ? pendingCount : undefined,
          href: isModerator ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: tabIcon("person-outline") }}
      />
    </Tabs>
  );
}
