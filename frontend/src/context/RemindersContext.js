import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../api/api";
import { AuthContext } from "./AuthContext";
import { scheduleReminderNotifications } from "../utils/notifications";

export const RemindersContext = createContext({
  reminders: [],
  isLoading: false,
  refreshing: false,
  error: null,
  fetchReminders: async () => {},
});

export function RemindersProvider({ children }) {
  const { token } = useContext(AuthContext);
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchReminders = useCallback(
    async (mode = "initial") => {
      if (!token) {
        setReminders([]);
        setIsLoading(false);
        setRefreshing(false);
        setError(null);
        return;
      }

      if (mode === "initial") {
        setIsLoading(true);
      }
      if (mode === "refresh") {
        setRefreshing(true);
      }
      if (mode !== "silent") {
        setError(null);
      }

      try {
        const response = await api.get("/reminders");
        const nextReminders = response.data?.reminders ?? [];
        setReminders(nextReminders);
        await scheduleReminderNotifications(nextReminders);
      } catch (err) {
        console.error("[RemindersProvider] Failed to load reminders", err);
        const message =
          err.response?.data?.error ||
          err.message ||
          "Unable to load reminders";
        setError(message);
      } finally {
        if (mode === "initial") {
          setIsLoading(false);
        }
        if (mode === "refresh") {
          setRefreshing(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      fetchReminders("initial");
    } else {
      setReminders([]);
      setIsLoading(false);
      setRefreshing(false);
      setError(null);
      scheduleReminderNotifications([]);
    }
  }, [token, fetchReminders]);

  const value = useMemo(
    () => ({ reminders, isLoading, refreshing, error, fetchReminders }),
    [reminders, isLoading, refreshing, error, fetchReminders]
  );

  return (
    <RemindersContext.Provider value={value}>
      {children}
    </RemindersContext.Provider>
  );
}
