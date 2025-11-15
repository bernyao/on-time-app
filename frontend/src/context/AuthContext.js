import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ActivityIndicator, View } from "react-native";
import api from "../api/api";
import {
  deleteToken as deleteStoredToken,
  getToken as getStoredToken,
  saveToken as saveStoredToken,
} from "../utils/secureStore";

export const AuthContext = createContext({
  token: null,
  user: null,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await getStoredToken();
        if (storedToken) {
          setToken(storedToken);
          api.setAuthToken(storedToken);
          // Optional: fetch profile here if available
        }
      } catch (error) {
        console.warn("[AuthProvider] Failed to load token", error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const response = await api.post("/auth/login", { email, password });
    const { token: nextToken, user: nextUser } = response.data;

    if (!nextToken) {
      throw new Error("Token missing in login response");
    }

    await saveStoredToken(nextToken);
    api.setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser || null);
    return nextUser || null;
  }, []);

  const signUp = useCallback(async ({ name, email, password }) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
    });
    const { token: nextToken, user: nextUser } = response.data;

    if (!nextToken) {
      throw new Error("Token missing in register response");
    }

    await saveStoredToken(nextToken);
    api.setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser || null);
    return nextUser || null;
  }, []);

  const signOut = useCallback(async () => {
    await deleteStoredToken();
    api.clearAuthToken();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, isLoading, signIn, signUp, signOut }),
    [token, user, isLoading, signIn, signUp, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {isLoading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" />
        </View>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
