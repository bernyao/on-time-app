import React, { useCallback, useState } from "react";
import {
  Alert,
  Button,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { saveCanvasConnection, syncCanvas } from "../api/canvas";
import useReminders from "../hooks/useReminders";

export default function SettingsContent({ style }) {
  const { fetchReminders } = useReminders();
  const [icsUrl, setIcsUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSave = useCallback(async () => {
    const trimmed = icsUrl.trim();
    if (!trimmed) {
      Alert.alert("Missing URL", "Enter your Canvas calendar ICS URL.");
      return;
    }

    try {
      setIsSaving(true);
      setStatusMessage("");
      await saveCanvasConnection(trimmed);
      setStatusMessage("Canvas calendar saved successfully.");
      Keyboard.dismiss();
    } catch (error) {
      console.error("[SettingsContent] Failed to save Canvas URL", error);
      let message =
        error.response?.data?.error ||
        error.message ||
        "Unable to save Canvas URL";
      if (error.response?.data?.error === "invalid_ics_url") {
        message = "Enter the full https:// Canvas calendar link.";
      }
      Alert.alert("Save failed", message);
    } finally {
      setIsSaving(false);
    }
  }, [icsUrl]);

  const handleSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      setStatusMessage("");
      await syncCanvas(icsUrl.trim());
      setStatusMessage("Sync completed.");
      await fetchReminders("silent");
    } catch (error) {
      console.error("[SettingsContent] Canvas sync failed", error);
      let message =
        error.response?.data?.error || error.message || "Unable to sync Canvas";
      if (error.response?.data?.error === "invalid_ics_url") {
        message = "Enter the full https:// Canvas calendar link.";
      }
      Alert.alert("Sync failed", message);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchReminders, icsUrl]);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.header}>Canvas Integration</Text>
      <Text style={styles.description}>
        Paste the ICS feed URL from Canvas. You can usually find this in your
        Canvas calendar settings.
      </Text>
      <TextInput
        placeholder="https://school.instructure.com/calendar.ics"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={styles.input}
        value={icsUrl}
        onChangeText={setIcsUrl}
      />
      <View style={styles.buttonWrapper}>
        <Button
          title={isSaving ? "Saving..." : "Save Canvas URL"}
          onPress={handleSave}
          disabled={isSaving}
        />
      </View>
      <View style={styles.separator} />
      <View style={styles.buttonWrapper}>
        <Button
          title={isSyncing ? "Syncing..." : "Sync Canvas Now"}
          onPress={handleSync}
          disabled={isSyncing}
        />
      </View>
      {statusMessage ? (
        <Text style={styles.status}>{statusMessage}</Text>
      ) : null}
      <Text style={styles.note}>
        After syncing, reminders from Canvas appear alongside manual reminders.
        You can pull down on the reminders list to refresh at any time.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  description: {
    color: "#4a5568",
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 16,
  },
  buttonWrapper: {
    marginBottom: 8,
  },
  status: {
    color: "#047857",
    fontWeight: "600",
    marginBottom: 16,
  },
  note: {
    color: "#6b7280",
    lineHeight: 20,
    marginTop: 8,
  },
});
