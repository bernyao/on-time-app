import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const NAV_ITEMS = [
  { key: "home", icon: "home" },
  { key: "calendar", icon: "calendar" },
  { key: "add", icon: "plus-circle" },
  { key: "pencil", icon: "edit-3" },
  { key: "user", icon: "user" },
];

export default function BottomNav({ activeKey, onPress }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.navContainer,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <View style={styles.navBar}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => onPress?.(item.key)}
              style={[styles.navItem, isActive && styles.navItemActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Feather
                name={item.icon}
                size={22}
                color={isActive ? "#1d4ed8" : "#4b5563"}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 28,
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: "#d1d5db",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    borderRadius: 16,
  },
  navItemActive: {
    backgroundColor: "#e0f2fe",
  },
});
