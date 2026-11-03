import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../src/auth/AuthContext";
import { Screen } from "../src/components/Screen";
import { Banner, Button, Card, SectionTitle } from "../src/components/ui";
import { theme } from "../src/constants/theme";
import { DEMO_PASSWORD, seedUsers } from "../src/demo/seed";

// US-01: email + password login and its error messages are Iris's design;
// the demo-account shortcuts below fill the form for quick demos.
export default function LoginScreen() {
  const { isLoggedIn, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (isLoggedIn) return <Redirect href="/" />;

  async function handleLogin(address = email, secret = password) {
    setError("");

    if (!address.trim() || !secret) {
      setError("Please enter your email and password.");
      return;
    }

    const success = await login(address, secret);

    if (success) {
      router.replace("/(tabs)");
    } else {
      setError("Invalid email or password.");
    }
  }

  return (
    <Screen title="Monument Capture" subtitle="Log in to your account">
      <View style={styles.hero}>
        <Ionicons color={theme.colors.primary} name="flag" size={40} />
        <Text style={styles.heroText}>Claim real monuments by standing next to them. Hold them to win.</Text>
      </View>

      <Card>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={(t) => {
            setEmail(t);
            setError("");
          }}
          placeholder="Email"
          placeholderTextColor={theme.colors.muted}
          style={styles.input}
          value={email}
        />
        <TextInput
          accessibilityLabel="Password"
          autoComplete="password"
          onChangeText={(t) => {
            setPassword(t);
            setError("");
          }}
          onSubmitEditing={() => void handleLogin()}
          placeholder="Password"
          placeholderTextColor={theme.colors.muted}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Button label="Log In" icon="log-in-outline" onPress={() => void handleLogin()} />
      </Card>

      <SectionTitle>Demo accounts</SectionTitle>
      <Text style={styles.hint}>{`Every demo account uses the password ${DEMO_PASSWORD}. Tap one to log in.`}</Text>
      {seedUsers.map((u) => (
        <Card
          key={u.id}
          onPress={() => {
            setEmail(u.email);
            setPassword(DEMO_PASSWORD);
            void handleLogin(u.email, DEMO_PASSWORD);
          }}
          style={styles.account}
        >
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
  input: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    padding: 14,
  },
  hint: { color: theme.colors.muted, marginTop: -10 },
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
