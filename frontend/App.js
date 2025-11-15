import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation";
import {
  configureNotifications,
  requestNotificationPermission,
} from "./src/utils/notifications";

export default function App() {
  useEffect(() => {
    configureNotifications();
    requestNotificationPermission();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
