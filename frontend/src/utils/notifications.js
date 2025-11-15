import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

let notificationsConfigured = false;

export function configureNotifications() {
  if (notificationsConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch((error) => {
      console.error("[notifications] Failed to set Android channel", error);
    });
  }

  notificationsConfigured = true;
}

export async function requestNotificationPermission() {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }

    const request = await Notifications.requestPermissionsAsync();
    return (
      request.granted ||
      request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.error("[notifications] Failed to request permission", error);
    return false;
  }
}

export async function scheduleReminderNotifications(reminders = []) {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted) {
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();

    for (const reminder of reminders) {
      const dueAt = reminder.due_at || reminder.dueAt;
      if (!dueAt) {
        continue;
      }

      const dueDate = new Date(dueAt);
      if (Number.isNaN(dueDate.getTime()) || dueDate.getTime() <= now) {
        continue;
      }

      const when = dueDate.toLocaleString();
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.title
              ? `Reminder: ${reminder.title}`
              : "Upcoming reminder",
            body: `Due ${when}`,
            data: {
              reminderId: reminder.id,
              source: reminder.source,
            },
          },
          trigger: dueDate,
        });
      } catch (error) {
        console.error(
          `[notifications] Failed to schedule reminder ${reminder.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("[notifications] Scheduling failed", error);
  }
}
