
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";

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
      <Stack screenOptions={{ headerShown: false }} />
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
