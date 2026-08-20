import type * as NotificationsType from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// expo-notifications nécessite un build natif (pas Expo Go)
// On charge le module dynamiquement pour éviter le crash en dev
let N: typeof NotificationsType | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  N = require("expo-notifications");
  N!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Expo Go : module natif absent, les notifications sont désactivées
}

const CHANNEL_ID = "tsuya-main";
const ID_MORNING = "tsuya-morning";
const ID_EVENING = "tsuya-evening";
const STREAK_MILESTONES = [3, 7, 14, 30];

export type NotifPrefs = {
  morning: boolean;
  evening: boolean;
  levelUp: boolean;
  streak: boolean;
};

const PREFS_KEY = "tsuya_notif_prefs";
const DEFAULT_PREFS: NotifPrefs = { morning: true, evening: true, levelUp: true, streak: true };

export async function getNotifPrefs(): Promise<NotifPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveNotifPrefs(prefs: NotifPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  await applyNotifPrefs(prefs);
}

async function applyNotifPrefs(prefs: NotifPrefs): Promise<void> {
  if (!N) return;
  if (prefs.morning) {
    await N.scheduleNotificationAsync({
      identifier: ID_MORNING,
      content: { title: "⭐ Tsuya", body: "Nouvelle journée, nouvelles habitudes à valider !", sound: true },
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0, channelId: CHANNEL_ID },
    });
  } else {
    await N.cancelScheduledNotificationAsync(ID_MORNING).catch(() => {});
  }

  if (prefs.evening) {
    await N.scheduleNotificationAsync({
      identifier: ID_EVENING,
      content: { title: "👀 Tu as oublié quelque chose ?", body: "Il est 20h — tes habitudes t'attendent encore aujourd'hui.", sound: true },
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 0, channelId: CHANNEL_ID },
    });
  } else {
    await N.cancelScheduledNotificationAsync(ID_EVENING).catch(() => {});
  }
}

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
  const prefs = await getNotifPrefs();
  await applyNotifPrefs(prefs);
}

export async function notifyLevelUp(level: number) {
  if (!N) return;
  const prefs = await getNotifPrefs();
  if (!prefs.levelUp) return;
  await N.scheduleNotificationAsync({
    content: { title: `🎉 Niveau ${level} atteint !`, body: "Tu progresses vite. Continue sur cette lancée !", sound: true },
    trigger: null,
  });
}

export async function notifyStreakIfMilestone(streak: number) {
  if (!N || !STREAK_MILESTONES.includes(streak)) return;
  const prefs = await getNotifPrefs();
  if (!prefs.streak) return;
  await N.scheduleNotificationAsync({
    content: { title: `🔥 ${streak} jours de suite !`, body: "Impressionnant. Ne brise pas ta série maintenant !", sound: true },
    trigger: null,
  });
}
