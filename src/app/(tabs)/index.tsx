import BadgeModal from "@/components/BadgeModal";
import WeekStrip from "@/components/WeekStrip";
import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/context/HabitsContext";
import { supabase } from "@/lib/supabase";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

type Habit = {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  frequency: string;
  duration_days: number | null;
  is_public: boolean;
  source_habit_id: string | null;
};
type Profile = { level: number; coins: number };

function dKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeStreak(dates: Set<string>) {
  const dayMs = 86400000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = new Date(today);
  if (!dates.has(dKey(cursor))) {
    cursor = new Date(today.getTime() - dayMs);
    if (!dates.has(dKey(cursor))) return 0;
  }
  let streak = 0;
  while (dates.has(dKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - dayMs);
  }
  return streak;
}

export default function Home() {
  const { session } = useAuth();
  const { refreshKey, openEditModal } = useHabits();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState(0);
  const [selectedDate, setSelectedDate] = useState(dKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [earnedBadge, setEarnedBadge] = useState<{ key: string; level: number } | null>(null);

  const isToday = selectedDate === dKey(new Date());

  const fetchHabits = useCallback(async (date: string) => {
    const { data, error } = await supabase
      .from("habits")
      .select("id, title, description, xp_reward, frequency, duration_days, is_public, source_habit_id")
      .eq("user_id", session?.user.id)
      .eq("is_active", true)
      .lte("start_date", date)
      .order("created_at", { ascending: false });
    if (error) Alert.alert("Erreur", error.message);
    else setHabits(data ?? []);
    setLoading(false);
  }, [session]);

  const fetchProfile = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("level, coins")
      .eq("id", session?.user.id)
      .single();
    if (data) setProfile(data);
  }, [session]);

  const fetchStreak = useCallback(async () => {
    const { data } = await supabase.from("habit_logs").select("completed_on");
    setStreak(
      computeStreak(new Set((data ?? []).map((l) => l.completed_on as string))),
    );
  }, []);

  const fetchLogs = useCallback(async (date: string) => {
    const { data, error } = await supabase
      .from("habit_logs")
      .select("habit_id")
      .eq("completed_on", date);
    if (!error) setDone(new Set((data ?? []).map((l) => l.habit_id)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHabits(selectedDate);
      fetchProfile();
      fetchStreak();
    }, [fetchHabits, fetchProfile, fetchStreak, selectedDate]),
  );
  useEffect(() => {
    fetchHabits(selectedDate);
    fetchProfile();
    fetchStreak();
  }, [refreshKey, fetchHabits, fetchProfile, fetchStreak, selectedDate]);
  useEffect(() => {
    fetchLogs(selectedDate);
  }, [selectedDate, refreshKey, fetchLogs]);

  async function complete(habit: Habit) {
    if (!isToday) {
      Alert.alert("Info", "Tu ne peux valider que pour aujourd'hui.");
      return;
    }
    if (done.has(habit.id)) return;
    setDone((prev) => new Set(prev).add(habit.id));
    const { data, error } = await supabase.rpc("complete_habit", {
      p_habit_id: habit.id,
    });
    if (error) {
      setDone((prev) => {
        const n = new Set(prev);
        n.delete(habit.id);
        return n;
      });
      Alert.alert("Oups", error.message);
      return;
    }
    fetchProfile();
    fetchStreak();
    if (data?.leveled_up) {
      if (data.badge_key) {
        setEarnedBadge({ key: data.badge_key, level: data.level });
      } else {
        Alert.alert("Niveau supérieur ! 🎉", `Niveau ${data.level} · +${data.coins_gained} coins`);
      }
    }
  }

  function confirmRemove(habit: Habit) {
    const isJoined = !!habit.source_habit_id;
    Alert.alert(
      isJoined ? "Quitter le challenge ?" : "Supprimer ?",
      isJoined
        ? `Quitter « ${habit.title} » ? Tu pourras le rejoindre à nouveau depuis les Challenges.`
        : `Supprimer « ${habit.title} » ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: isJoined ? "Quitter" : "Supprimer",
          style: "destructive",
          onPress: () => removeHabit(habit.id),
        },
      ],
    );
  }

  async function removeHabit(id: string) {
    const { error } = await supabase.from("habits").delete().eq("id", id);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  function renderLeftActions(habit: Habit) {
    return (
      <Pressable style={s.editBox} onPress={() => openEditModal(habit)}>
        <Ionicons name="pencil" size={22} color="white" />
        <Text style={s.editText}>Modifier</Text>
      </Pressable>
    );
  }

  function renderRightActions(habit: Habit) {
    const isJoined = !!habit.source_habit_id;
    return (
      <Pressable style={s.deleteBox} onPress={() => confirmRemove(habit)}>
        <Ionicons name={isJoined ? "exit-outline" : "trash"} size={22} color="white" />
        <Text style={s.deleteText}>{isJoined ? "Quitter" : "Supprimer"}</Text>
      </Pressable>
    );
  }

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );

  const level = profile?.level ?? 1;
  const coins = profile?.coins ?? 0;
  const dateLabel = selectedDate.split("-").reverse().join("/");

  return (
    <View style={s.container}>
      <View style={s.topRow}>
        <View style={s.lvlBadge}>
          <Text style={s.lvlText}>Lvl {level}</Text>
        </View>
        <View style={s.rightGroup}>
          <View style={s.coins}>
            <FontAwesome5 name="coins" size={13} color="#ca8a04" />
            <Text style={s.coinText}>{coins}</Text>
          </View>
          <View style={s.streak}>
            <Ionicons name="flame" size={18} color="#f97316" />
            <Text style={s.streakText}>{streak}</Text>
          </View>
        </View>
      </View>

      <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} />

      <Text style={s.title}>
        {isToday ? "Aujourd'hui 🎯" : `Le ${dateLabel}`}
      </Text>

      <BadgeModal
        badgeKey={earnedBadge?.key ?? null}
        level={earnedBadge?.level ?? 0}
        onClose={() => setEarnedBadge(null)}
      />

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={s.empty}>
            Aucune habitude.{"\n"}Appuie sur + pour en ajouter !
          </Text>
        }
        renderItem={({ item }) => {
          const isDone = done.has(item.id);
          return (
            <Swipeable
              renderLeftActions={item.source_habit_id ? undefined : () => renderLeftActions(item)}
              renderRightActions={() => renderRightActions(item)}
              overshootRight={false}
              overshootLeft={false}
            >
              <Pressable
                style={[s.card, isDone && s.cardDone, !isToday && s.cardPast]}
                onPress={() => complete(item)}
                disabled={isToday && isDone}
              >
                <Ionicons
                  name={isDone ? "checkmark-circle" : "ellipse-outline"}
                  size={28}
                  color={isDone ? "#22c55e" : "#c4c4c4"}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, isDone && s.cardTitleDone]}>
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text style={s.cardDesc}>{item.description}</Text>
                  ) : null}
                  {item.duration_days ? (
                    <Text style={s.cardMeta}>📅 {item.duration_days} jours</Text>
                  ) : null}
                  {item.is_public ? (
                    <Text style={s.cardPublic}>🌍 Challenge public</Text>
                  ) : null}
                </View>
                <Text style={s.xp}>+{item.xp_reward} XP</Text>
              </Pressable>
            </Swipeable>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  lvlBadge: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lvlText: { color: "#6366f1", fontWeight: "700", fontSize: 15 },
  rightGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  coins: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef9c3",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coinText: { color: "#ca8a04", fontWeight: "700", fontSize: 15 },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff7ed",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: { color: "#f97316", fontWeight: "700", fontSize: 15 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 14 },
  empty: { textAlign: "center", color: "#888", marginTop: 40, lineHeight: 22 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f4f5",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  cardDone: { backgroundColor: "#f0fdf4" },
  cardPast: { opacity: 0.7 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardTitleDone: { textDecorationLine: "line-through", color: "#888" },
  cardDesc: { color: "#777", marginTop: 2 },
  cardMeta: { color: "#6366f1", fontSize: 12, marginTop: 4, fontWeight: "600" },
  cardPublic: { color: "#10b981", fontSize: 12, marginTop: 2, fontWeight: "600" },
  xp: { color: "#6366f1", fontWeight: "700" },
  editBox: {
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    borderRadius: 12,
    gap: 4,
  },
  editText: { color: "white", fontWeight: "600", fontSize: 12 },
  deleteBox: {
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    borderRadius: 12,
    gap: 4,
  },
  deleteText: { color: "white", fontWeight: "600", fontSize: 12 },
});
