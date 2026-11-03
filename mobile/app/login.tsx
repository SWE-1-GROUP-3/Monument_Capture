import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "../src/components/Screen";
import { Banner, Button, Card, SectionTitle } from "../src/components/ui";
import { theme } from "../src/constants/theme";
import { seedUsers } from "../src/demo/seed";
import { demo, useCurrentUser } from "../src/demo/store";

export default function LoginScreen() {
  const user = useCurrentUser();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (user) return <Redirect href="/" />;

  const signIn = (address: string) => {
    try {
      demo.login(address);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    }
  };

  return (
    <Screen title="Monument Capture" subtitle="Claim real monuments by standing next to them. Hold them to win.">
      <View style={styles.hero}>
        <Ionicons color={theme.colors.primary} name="flag" size={40} />
        <Text style={styles.heroText}>Sign in with your email to start capturing.</Text>
      </View>

      <Card>
        <Text style={styles.label}>Email</Text>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          onSubmitEditing={() => signIn(email)}
          placeholder="you@example.com"
          placeholderTextColor={theme.colors.muted}
          style={styles.input}
          value={email}
        />
        <Button label="Sign in" icon="log-in-outline" onPress={() => signIn(email)} disabled={!email.trim()} />
        <Text style={styles.hint}>Demo sign-in: no password. A new email creates a new player.</Text>
      </Card>

      {error ? <Banner tone="danger">{error}</Banner> : null}

      <SectionTitle>Demo accounts</SectionTitle>
      {seedUsers.map((u) => (
        <Card key={u.id} onPress={() => signIn(u.email)} style={styles.account}>
          <View style={[styles.avatar, u.role === "moderator" && { backgroundColor: theme.colors.warningSoft }]}>
            <Ionicons
              color={u.role === "moderator" ? theme.colors.warning : theme.colors.primary}
              name={u.role === "moderator" ? "shield-checkmark" : "person"}
              size={20}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountName}>{u.name}</Text>
            <Text style={styles.accountMeta}>{u.email} · {u.role === "moderator" ? "Moderator" : "Player"}</Text>
          </View>
          <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.large,
    gap: theme.spacing.small,
    padding: theme.spacing.large,
  },
  heroText: { color: theme.colors.text, fontSize: 16, fontWeight: "600", textAlign: "center" },
  label: { color: theme.colors.text, fontWeight: "700" },
  input: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    padding: 12,
  },
  hint: { color: theme.colors.muted, fontSize: 13 },
  account: { alignItems: "center", flexDirection: "row", gap: theme.spacing.medium },
  avatar: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  accountName: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },
  accountMeta: { color: theme.colors.muted, marginTop: 2 },
});
