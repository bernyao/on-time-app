import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import SettingsContent from "../components/SettingsContent";

export default function SettingsScreen() {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <SettingsContent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
  },
});
