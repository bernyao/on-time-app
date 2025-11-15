import React, { useCallback, useContext, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import BottomNav from "../components/BottomNav";

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);
  const [activeNav, setActiveNav] = useState("user");

  const handleSettingsPress = useCallback(() => {
    navigation.navigate("Settings");
  }, [navigation]);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  useFocusEffect(
    useCallback(() => {
      setActiveNav("user");
    }, [])
  );

  const handleNavPress = useCallback(
    (navKey) => {
      if (navKey === "user") {
        setActiveNav("user");
        return;
      }

      setActiveNav(navKey);
      navigation.navigate("Home");
    },
    [navigation]
  );

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.profileCard}>
          <Text style={styles.profileName}>{user?.name || "Profile"}</Text>
          {user?.email ? (
            <Text style={styles.profileEmail}>{user.email}</Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <View style={styles.buttonWrapper}>
            <Button title="Settings" onPress={handleSettingsPress} />
          </View>
          <View style={styles.buttonWrapper}>
            <Button title="Sign Out" color="#b91c1c" onPress={handleSignOut} />
          </View>
        </View>
      </View>
      <BottomNav activeKey={activeNav} onPress={handleNavPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    flex: 1,
    padding: 24,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  profileEmail: {
    fontSize: 16,
    color: "#4b5563",
  },
  actions: {
    marginTop: 24,
  },
  buttonWrapper: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
  },
});
