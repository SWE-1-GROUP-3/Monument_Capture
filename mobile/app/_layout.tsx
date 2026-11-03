import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BackToMapButton } from "../src/components/BackToMapButton";
import { theme } from "../src/constants/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="monuments/[monumentId]" options={{
          headerShown: true,
          title: "Monument details",
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerLeft: () => <BackToMapButton />,
        }} />
      </Stack>
    </>
  );
}
