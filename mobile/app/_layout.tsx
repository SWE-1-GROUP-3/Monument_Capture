import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "../src/auth/AuthContext";
import { BackToMapButton } from "../src/components/BackToMapButton";
import { theme } from "../src/constants/theme";
import { installWebTheme } from "../src/theme/installWebTheme";

// Baloo 2 + the game stylesheet on web (no-op on native).
installWebTheme();

function AuthGuard() {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const onLoginScreen = segments[0] === "login";

    if (!isLoggedIn && !onLoginScreen) {
      router.replace("/login");
    } else if (isLoggedIn && onLoginScreen) {
      router.replace("/");
    }
  }, [isLoggedIn, loading, segments, router]);

  if (loading && segments[0] !== "login") return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="monuments/[monumentId]"
          options={{
            headerShown: true,
            title: "Monument details",
             headerTitleStyle: { fontWeight: "800" },
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTintColor: theme.colors.text,
            headerLeft: () => <BackToMapButton />,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard />
    </AuthProvider>
  );
}
