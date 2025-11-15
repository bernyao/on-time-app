import React, { useContext } from "react";
import AppNavigator from "./AppNavigator";
import AuthNavigator from "./AuthNavigator";
import { AuthContext } from "../context/AuthContext";

export default function RootNavigator() {
  const { token } = useContext(AuthContext);
  return token ? <AppNavigator /> : <AuthNavigator />;
}
