import type * as NotificationsType from "expo-notifications";
import { Platform } from "react-native";

// expo-notifications nécessite un build natif (pas Expo Go)
// On charge le module dynamiquement pour éviter le crash en dev
let N: typeof NotificationsType | null = null;
try {
  N = require("expo-notifications");
  N!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Expo Go : module natif absent, les notifications sont désactivées
}

const CHANNEL_ID = "tsuya-main";
const ID_MORNING = "tsuya-morning";
const ID_EVENING = "tsuya-evening";
const STREAK_MILESTONES = [3, 7, 14, 30];

export async function setupNotifications(): Promise<boolean> {
  if (!N) return false;

  if (Platform.OS === "android") {
    await N.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Tsuya",
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#3b82f6",
    });
  }

  const { status: current } = await N.getPermissionsAsync();
  if (current === "granted") {
    await scheduleDailyReminders();
    return true;
  }

  const { status } = await N.requestPermissionsAsync();
  if (status === "granted") {
    await scheduleDailyReminders();
    return true;
  }

  return false;
}

async function scheduleDailyReminders() {
  if (!N) return;

  await N.cancelScheduledNotificationAsync(ID_MORNING).catch(() => {});
  await N.cancelScheduledNotificationAsync(ID_EVENING).catch(() => {});

  await N.scheduleNotificationAsync({
    identifier: ID_MORNING,
    content: {
      title: "⭐ Tsuya",
      body: "Nouvelle journée, nouvelles habitudes à valider !",
      sound: true,
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
      channelId: CHANNEL_ID,
    },
  });

  await N.scheduleNotificationAsync({
    identifier: ID_EVENING,
    content: {
      title: "👀 Tu as oublié quelque chose ?",
      body: "Il est 20h — tes habitudes t'attendent encore aujourd'hui.",
      sound: true,
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
      channelId: CHANNEL_ID,
    },
  });
}

export async function notifyLevelUp(level: number) {
  if (!N) return;
  await N.scheduleNotificationAsync({
    content: {
      title: `🎉 Niveau ${level} atteint !`,
      body: "Tu progresses vite. Continue sur cette lancée !",
      sound: true,
    },
    trigger: null,
  });
}

export async function notifyStreakIfMilestone(streak: number) {
  if (!N || !STREAK_MILESTONES.includes(streak)) return;
  await N.scheduleNotificationAsync({
    content: {
      title: `🔥 ${streak} jours de suite !`,
      body: "Impressionnant. Ne brise pas ta série maintenant !",
      sound: true,
    },
    trigger: null,
  });
}
