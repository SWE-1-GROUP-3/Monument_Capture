import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { theme } from "../../src/constants/theme";
import { getPendingQueue } from "../../src/demo/rules";
import { useCurrentUser, useDemoState } from "../../src/demo/store";

type IconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => {
    const iconColor = typeof color === "string" ? color : theme.colors.muted;
    return <Ionicons color={iconColor} name={name} size={size} />;
  };
}

export default function TabLayout() {
  const user = useCurrentUser();
  const state = useDemoState();
  if (!user) return <Redirect href="/login" />;

  const isModerator = user.role === "moderator";
  // `href: null` hides a tab for this role while keeping one shared tab bar.
  const playerOnly = isModerator ? null : undefined;
  const moderatorOnly = isModerator ? undefined : null;
  const pendingCount = isModerator ? getPendingQueue(state).length : 0;

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
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home-outline") }} />
      <Tabs.Screen name="explore" options={{ title: "Map", tabBarIcon: tabIcon("map-outline") }} />
      <Tabs.Screen name="capture" options={{ title: "Capture", tabBarIcon: tabIcon("camera-outline"), href: playerOnly }} />
      <Tabs.Screen name="activity" options={{ title: "Activity", tabBarIcon: tabIcon("time-outline"), href: playerOnly }} />
      <Tabs.Screen
        name="queue"
        options={{
          title: "Queue",
          tabBarIcon: tabIcon("checkmark-done-outline"),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          href: moderatorOnly,
        }}
      />
      <Tabs.Screen name="manage" options={{ title: "Monuments", tabBarIcon: tabIcon("business-outline"), href: moderatorOnly }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("person-outline") }} />
    </Tabs>
  );
}
