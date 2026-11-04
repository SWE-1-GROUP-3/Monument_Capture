
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "../src/auth/AuthContext";
import BackToMapButton from "../src/components/BackToMapButton";
import { theme } from "../src/constants/theme";

function AuthGuard() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const onLoginScreen = segments[0] === "login";

    if (!isLoggedIn && !onLoginScreen) {
      router.replace("/login");
    } else if (isLoggedIn && onLoginScreen) {
      router.replace("/");
    }
  }, [isLoggedIn, segments, router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="monuments/[monumentId]"
          options={{
            headerShown: true,
            title: "Monument details",
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

