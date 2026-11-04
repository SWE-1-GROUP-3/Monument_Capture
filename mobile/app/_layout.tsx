import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "../src/auth/AuthContext";
import { BackToMapButton } from "../src/components/BackToMapButton";
import { theme } from "../src/constants/theme";
import { installWebTheme } from "../src/theme/installWebTheme";

// Baloo 2 + the game stylesheet on web (no-op on native).
installWebTheme();

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="monuments/[monumentId]" options={{
          headerShown: true,
          title: "Monument details",
          headerTitleStyle: { fontWeight: "800" },
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerLeft: () => <BackToMapButton />,
        }} />
      </Stack>
    </AuthProvider>
  );
}
