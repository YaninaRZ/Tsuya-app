import BadgeModal from "@/components/BadgeModal";
import LootModal from "@/components/LootModal";
import WeekStrip from "@/components/WeekStrip";
import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/context/HabitsContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";

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
import Svg, { Circle } from "react-native-svg";

type PackInfo = { name: string; difficulty: string };
type Habit = {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  frequency: string;
  duration_days: number | null;
  is_public: boolean;
  source_habit_id: string | null;
  packInfo?: PackInfo | null;
};
type Profile = { level: number; coins: number };

const PACK_COLORS: Record<string, string> = { easy: "#10b981", medium: "#f97316", hard: "#ef4444" };

function dKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeStreak(dates: Set<string>) {
  const dayMs = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let cursor = new Date(today);
  if (!dates.has(dKey(cursor))) { cursor = new Date(today.getTime() - dayMs); if (!dates.has(dKey(cursor))) return 0; }
  let streak = 0;
  while (dates.has(dKey(cursor))) { streak++; cursor = new Date(cursor.getTime() - dayMs); }
  return streak;
}

// Arc gauge component — 270° track, fills based on percent
function ArcGauge({ percent, color, size = 62 }: { percent: number; color: string; size?: number }) {
  const strokeW = 7;
  const r = (size - strokeW * 2) / 2;
  const cx = size / 2; const cy = size / 2;
  const fullCirc = 2 * Math.PI * r;
  const arc = fullCirc * 0.75;
  const fill = arc * Math.max(0, Math.min(1, percent));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: "135deg" }] }}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeW}
        strokeDasharray={`${arc} ${fullCirc}`} strokeLinecap="round" />
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${fill} ${fullCirc}`} strokeLinecap="round" />
    </Svg>
  );
}

function statusChip(isDone: boolean, isPublic: boolean, streak: number) {
  if (isDone) return { icon: "checkmark-circle" as const, label: "Complété !", color: "#3b82f6", bg: "#dbeafe" };
  if (isPublic) return { icon: "trophy" as const, label: "Challenge !", color: "#8b5cf6", bg: "#ede9fe" };
  if (streak > 2) return { icon: "flame" as const, label: "Continue !", color: "#f97316", bg: "#ffedd5" };
  return { icon: "time-outline" as const, label: "À faire", color: "#9ca3af", bg: "#f3f4f6" };
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
  const [loot, setLoot] = useState<{ label: string; type: "xp_boost" | "coins_bonus" | "free_reward"; value: number | null } | null>(null);

  const isToday = selectedDate === dKey(new Date());

  const fetchHabits = useCallback(async (date: string) => {
    const { data, error } = await supabase
      .from("habits")
      .select("id, title, description, xp_reward, frequency, duration_days, is_public, source_habit_id")
      .eq("user_id", session?.user.id)
      .eq("is_active", true)
      .lte("start_date", date)
      .order("created_at", { ascending: false });
    if (error) { Alert.alert("Erreur", error.message); setLoading(false); return; }

    const habits: Habit[] = data ?? [];
    const sourceIds = habits.filter((h) => h.source_habit_id).map((h) => h.source_habit_id as string);

    if (sourceIds.length > 0) {
      const { data: sources } = await supabase
        .from("habits").select("id, pack:reward_packs(name, difficulty)").in("id", sourceIds);
      const packMap: Record<string, PackInfo> = {};
      for (const s of (sources ?? []) as any[]) { if (s.pack) packMap[s.id] = s.pack; }
      setHabits(habits.map((h) => h.source_habit_id ? { ...h, packInfo: packMap[h.source_habit_id] ?? null } : h));
    } else {
      setHabits(habits);
    }
    setLoading(false);
  }, [session]);

  const fetchProfile = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("level, coins").eq("id", session?.user.id).single();
    if (data) setProfile(data);
  }, [session]);

  const fetchStreak = useCallback(async () => {
    const { data } = await supabase.from("habit_logs").select("completed_on");
    const dates = new Set((data ?? []).map((l) => l.completed_on as string));
    setStreak(computeStreak(dates));
  }, []);

  const fetchLogs = useCallback(async (date: string) => {
    const { data, error } = await supabase.from("habit_logs").select("habit_id").eq("completed_on", date);
    if (!error) setDone(new Set((data ?? []).map((l) => l.habit_id)));
  }, []);

  useFocusEffect(useCallback(() => {
    fetchHabits(selectedDate); fetchProfile(); fetchStreak();
  }, [fetchHabits, fetchProfile, fetchStreak, selectedDate]));

  useEffect(() => {
    fetchHabits(selectedDate); fetchProfile(); fetchStreak();
  }, [refreshKey, fetchHabits, fetchProfile, fetchStreak, selectedDate]);

  useEffect(() => { fetchLogs(selectedDate); }, [selectedDate, refreshKey, fetchLogs]);

  async function complete(habit: Habit) {
    if (!isToday) { Alert.alert("Info", "Tu ne peux valider que pour aujourd'hui."); return; }
    if (done.has(habit.id)) return;
    setDone((prev) => new Set(prev).add(habit.id));
    const { data, error } = await supabase.rpc("complete_habit", { p_habit_id: habit.id });
    if (error) {
      setDone((prev) => { const n = new Set(prev); n.delete(habit.id); return n; });
      Alert.alert("Oups", error.message); return;
    }
    fetchProfile(); fetchStreak();
    if (data?.loot_label) {
      setLoot({ label: data.loot_label, type: data.loot_type, value: data.loot_value });
    } else if (data?.leveled_up) {
      if (data.badge_key) setEarnedBadge({ key: data.badge_key, level: data.level });
      else Alert.alert("Niveau supérieur ! 🎉", `Niveau ${data.level} · +${data.coins_gained} coins`);
    }
  }

  function confirmRemove(habit: Habit) {
    const isJoined = !!habit.source_habit_id;
    Alert.alert(
      isJoined ? "Quitter le challenge ?" : "Supprimer ?",
      isJoined ? `Quitter « ${habit.title} » ? Tu pourras le rejoindre depuis les Challenges.` : `Supprimer « ${habit.title} » ?`,
      [{ text: "Annuler", style: "cancel" }, { text: isJoined ? "Quitter" : "Supprimer", style: "destructive", onPress: () => removeHabit(habit.id) }],
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
        <Ionicons name="pencil" size={20} color="white" />
        <Text style={s.swipeLabel}>Modifier</Text>
      </Pressable>
    );
  }

  function renderRightActions(habit: Habit) {
    const isJoined = !!habit.source_habit_id;
    return (
      <Pressable style={s.deleteBox} onPress={() => confirmRemove(habit)}>
        <Ionicons name={isJoined ? "exit-outline" : "trash"} size={20} color="white" />
        <Text style={s.swipeLabel}>{isJoined ? "Quitter" : "Supprimer"}</Text>
      </Pressable>
    );
  }

  if (loading)
    return <View style={s.center}><ActivityIndicator color="#6366f1" size="large" /></View>;

  const level = profile?.level ?? 1;
  const coins = profile?.coins ?? 0;

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.levelBadge}>
          <Ionicons name="star" size={13} color="#7c6ee6" />
          <Text style={s.levelText}>Niveau {level}</Text>
        </View>
        <View style={s.topRight}>
          <View style={s.coinPill}>
            <Ionicons name="cash-outline" size={14} color="#ca8a04" />
            <Text style={s.coinText}>{coins}</Text>
          </View>
          <View style={s.flamePill}>
            <Ionicons name="flame" size={15} color="#f97316" />
            <Text style={s.flameText}>{streak}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
            <Text style={s.sectionTitle}>
              {isToday ? "Mes habitudes" : selectedDate.split("-").reverse().join("/")}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>🌱</Text>
            <Text style={s.emptyText}>Aucune habitude.{"\n"}Appuie sur + pour commencer !</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isDone = done.has(item.id);
          const chip = statusChip(isDone, item.is_public && !item.source_habit_id, streak);
          const arcColor = isDone ? "#60a5fa" : item.source_habit_id ? "#a78bfa" : "#f9a8d4";
          const arcPercent = isDone ? 1 : 0;

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
                {/* Arc gauge */}
                <View style={s.arcWrap}>
                  <ArcGauge percent={arcPercent} color={arcColor} size={62} />
                  <View style={s.arcCenter}>
                    {isDone
                      ? <Ionicons name="checkmark" size={18} color="#10b981" />
                      : <Ionicons name="ellipse-outline" size={18} color="#c4c4c4" />}
                  </View>
                </View>

                {/* Content */}
                <View style={s.cardBody}>
                  <Text style={[s.cardTitle, isDone && s.cardTitleDone]} numberOfLines={2}>{item.title}</Text>

                  <View style={s.cardMeta}>
                    <View style={s.metaChip}>
                      <Ionicons name="repeat" size={11} color="#6b7280" />
                      <Text style={s.metaText}>{item.frequency === "daily" ? "Quotidien" : "Hebdo"}</Text>
                    </View>
                    <View style={s.metaChip}>
                      <Ionicons name="flash" size={11} color="#6366f1" />
                      <Text style={[s.metaText, { color: "#6366f1" }]}>+{item.xp_reward} XP</Text>
                    </View>
                    {item.duration_days ? (
                      <View style={s.metaChip}>
                        <Ionicons name="calendar-outline" size={11} color="#6b7280" />
                        <Text style={s.metaText}>{item.duration_days}j</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={s.cardBottom}>
                    <View style={[s.statusChip, { backgroundColor: chip.bg }]}>
                      <Ionicons name={chip.icon} size={12} color={chip.color} />
                      <Text style={[s.statusText, { color: chip.color }]}>{chip.label}</Text>
                    </View>
                    {item.packInfo ? (
                      <View style={[s.packChip, { borderColor: PACK_COLORS[item.packInfo.difficulty] ?? "#888" }]}>
                        <Ionicons name="gift-outline" size={11} color={PACK_COLORS[item.packInfo.difficulty] ?? "#888"} />
                        <Text style={[s.packText, { color: PACK_COLORS[item.packInfo.difficulty] ?? "#888" }]}>{item.packInfo.name}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            </Swipeable>
          );
        }}
      />

      <BadgeModal badgeKey={earnedBadge?.key ?? null} level={earnedBadge?.level ?? 0} onClose={() => setEarnedBadge(null)} />
      <LootModal loot={loot} onClose={() => setLoot(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingHorizontal: 18, paddingTop: 58 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Top bar
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#ede9fe", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  levelText: { color: "#7c3aed", fontWeight: "700", fontSize: 14 },
  topRight: { flexDirection: "row", gap: 8 },
  coinPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fef9c3", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  coinText: { color: "#b45309", fontWeight: "700", fontSize: 14 },
  flamePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff7ed", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  flameText: { color: "#ea580c", fontWeight: "700", fontSize: 14 },

  // Section header
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1e1b4b", marginBottom: 12 },

  // Empty state
  emptyWrap: { alignItems: "center", marginTop: 48, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { textAlign: "center", color: "#9ca3af", lineHeight: 22, fontSize: 14 },

  // Habit cards
  card: { backgroundColor: "white", borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10, shadowColor: "#1e1b4b", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  cardDone: { backgroundColor: "#f0f7ff" },
  cardPast: { opacity: 0.6 },
  arcWrap: { width: 62, height: 62, alignItems: "center", justifyContent: "center", position: "relative" },
  arcCenter: { position: "absolute" },
  cardBody: { flex: 1, gap: 5 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1e1b4b", lineHeight: 20 },
  cardTitleDone: { textDecorationLine: "line-through", color: "#9ca3af" },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#f1f5f9", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  metaText: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  cardBottom: { flexDirection: "row", flexWrap: "wrap", gap: 5, alignItems: "center" },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: "700" },
  packChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  packText: { fontSize: 11, fontWeight: "700" },

  // Swipe actions
  editBox: { backgroundColor: "#7c3aed", justifyContent: "center", alignItems: "center", width: 80, borderRadius: 18, gap: 4, marginBottom: 10 },
  deleteBox: { backgroundColor: "#ef4444", justifyContent: "center", alignItems: "center", width: 80, borderRadius: 18, gap: 4, marginBottom: 10 },
  swipeLabel: { color: "white", fontWeight: "600", fontSize: 11 },
});
