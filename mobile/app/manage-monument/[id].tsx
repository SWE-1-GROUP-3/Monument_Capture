import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { RequireUser } from "../../src/components/RequireUser";
import { Screen } from "../../src/components/Screen";
import { MonumentMap } from "../../src/components/map/MonumentMap";
import { Banner, Button, Card } from "../../src/components/ui";
import { theme } from "../../src/constants/theme";
import { findMonument, validateMonument } from "../../src/demo/rules";
import { demo, getDemoState } from "../../src/demo/store";

type Form = { name: string; neighborhood: string; description: string; latitude: string; longitude: string; radius: string };

function initialForm(id: string | undefined): Form {
  const m = findMonument(getDemoState(), id);
  return m
    ? {
        name: m.name,
        neighborhood: m.neighborhood,
        description: m.description,
        latitude: String(m.latitude),
        longitude: String(m.longitude),
        radius: String(m.captureRadiusMeters),
      }
    : { name: "", neighborhood: "", description: "", latitude: "40.7500", longitude: "-73.9900", radius: "80" };
}

export default function EditMonumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const [form, setForm] = useState<Form>(() => initialForm(isNew ? undefined : id));
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof Form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const input = {
    id: isNew ? undefined : id,
    name: form.name,
    neighborhood: form.neighborhood,
    description: form.description,
    latitude: Number.parseFloat(form.latitude),
    longitude: Number.parseFloat(form.longitude),
    captureRadiusMeters: Number.parseFloat(form.radius),
  };
  const coordsValid = !validateMonument({ ...input, name: input.name || "x" });

  const save = () => {
    try {
      const saved = demo.saveMonument(input);
      router.replace(`/monuments/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  };

  return (
    <RequireUser role="moderator">
      {() =>
        !isNew && !findMonument(getDemoState(), id) ? (
          <Screen title="Monument not found" back backTo="/manage">
            <Banner tone="warning">This monument does not exist.</Banner>
          </Screen>
        ) : (
          <Screen title={isNew ? "Add monument" : "Edit monument"} back backTo="/manage">
            <Card>
              <Field label="Name" value={form.name} onChange={set("name")} placeholder="e.g. Alexander Hamilton Statue" />
              <Field label="Neighborhood" value={form.neighborhood} onChange={set("neighborhood")} placeholder="e.g. Central Park" />
              <Field label="Description" value={form.description} onChange={set("description")} placeholder="One line about the monument" multiline />
              <View style={styles.twoCol}>
                <Field label="Latitude" value={form.latitude} onChange={set("latitude")} numeric />
                <Field label="Longitude" value={form.longitude} onChange={set("longitude")} numeric />
              </View>
              <Field label="Capture radius (m)" value={form.radius} onChange={set("radius")} numeric hint="10 to 500 m. Smaller is stricter." />
            </Card>

            {coordsValid ? (
              <View style={styles.map}>
                <MonumentMap
                  monuments={[{
                    id: "preview",
                    name: form.name || "New monument",
                    latitude: input.latitude,
                    longitude: input.longitude,
                    captureRadiusMeters: input.captureRadiusMeters,
                    hold: null,
                  }]}
                  playerLocation={null}
                  nowMs={Date.now()}
                  height={220}
                />
              </View>
            ) : null}

            {error ? <Banner tone="danger">{error}</Banner> : null}
            <Button label={isNew ? "Add monument" : "Save changes"} icon="checkmark" onPress={save} />
          </Screen>
        )
      }
    </RequireUser>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        inputMode={numeric ? "decimal" : "text"}
        multiline={multiline}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        style={[styles.input, multiline && { minHeight: 64, textAlignVertical: "top" }]}
        value={value}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, gap: 4, marginBottom: 6 },
  label: { color: theme.colors.text, fontWeight: "700" },
  hint: { color: theme.colors.muted, fontSize: 13 },
  input: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    padding: 10,
  },
  twoCol: { flexDirection: "row", gap: theme.spacing.small },
  map: { borderColor: theme.colors.border, borderRadius: theme.radius.medium, borderWidth: 1, overflow: "hidden" },
});
