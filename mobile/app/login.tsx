import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../src/auth/AuthContext";
import { Screen } from "../src/components/Screen";
import { Banner, Button, Card } from "../src/components/ui";
import { theme } from "../src/constants/theme";

// Supabase credentials are verified against the backend account mapping.
export default function LoginScreen() {
  const { isLoggedIn, login, loading, error: authError } = useAuth();
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
      router.replace("/");
    } else {
      setError("");
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
        {error || authError ? <Banner tone="danger">{error || authError}</Banner> : null}
        <Button disabled={loading} label={loading ? "Logging in…" : "Log In"} icon="log-in-outline" onPress={() => void handleLogin()} />
      </Card>
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
    borderRadius: 14,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    padding: 14,
  },
});
