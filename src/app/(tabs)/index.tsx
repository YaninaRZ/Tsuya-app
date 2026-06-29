import BadgeModal from "@/components/BadgeModal";
import LevelUpModal from "@/components/LevelUpModal";
import ConfirmModal from "@/components/ConfirmModal";
import LootModal from "@/components/LootModal";
import StreakModal from "@/components/StreakModal";
import WeekStrip from "@/components/WeekStrip";
import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/context/HabitsContext";
import { supabase } from "@/lib/supabase";
import { useTheme, type Theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import CatCoin from "@/components/CatCoin";

import { notifyLevelUp, notifyStreakIfMilestone } from "@/lib/notifications";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
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
  completionCount?: number;
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

const ENCOURAGE_MESSAGES = [
  "Tu es discipliné(e) ! Continue comme ça 💪",
  "Un pas de plus vers tes objectifs !",
  "Excellente habitude ! Tu es constant(e).",
  "Bravo ! La régularité, c'est ta force.",
];

export default function Home() {
  const t = useTheme();
  const s = makeStyles(t);
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
  const [pendingLevelUp, setPendingLevelUp] = useState<{ level: number; coins_gained: number; badge_key?: string } | null>(null);
  const [levelUpModal, setLevelUpModal] = useState<{ level: number; coins: number } | null>(null);
  const [streakOpen, setStreakOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Habit | null>(null);
  const [hasRewards, setHasRewards] = useState(true);
  const [filter, setFilter] = useState<"all" | "daily" | "weekly" | "challenge">("all");
  const [encourageVisible, setEncourageVisible] = useState(false);
  const [encourageMsg, setEncourageMsg] = useState("");

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

    // Fetch pack info and completion counts for joined challenges
    const joinedHabits = habits.filter((h) => h.source_habit_id);
    const habitsWithDuration = habits.filter((h) => h.source_habit_id && h.duration_days);

    const [sourcesRes, countsRes] = await Promise.all([
      sourceIds.length > 0
        ? supabase.from("habits").select("id, pack:reward_packs(name, difficulty)").in("id", sourceIds)
        : Promise.resolve({ data: [] }),
      habitsWithDuration.length > 0
        ? supabase.from("habit_logs").select("habit_id").in("habit_id", habitsWithDuration.map((h) => h.id))
        : Promise.resolve({ data: [] }),
    ]);

    const packMap: Record<string, PackInfo> = {};
    for (const s of (sourcesRes.data ?? []) as any[]) { if (s.pack) packMap[s.id] = s.pack; }

    const countMap: Record<string, number> = {};
    for (const log of (countsRes.data ?? []) as any[]) {
      countMap[log.habit_id] = (countMap[log.habit_id] ?? 0) + 1;
    }

    setHabits(habits.map((h) => ({
      ...h,
      packInfo: h.source_habit_id ? (packMap[h.source_habit_id] ?? null) : undefined,
      completionCount: h.duration_days ? (countMap[h.id] ?? 0) : undefined,
    })));
    setLoading(false);
  }, [session]);

  const fetchProfile = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("level, coins").eq("id", session?.user.id).single();
    if (data) setProfile(data);
  }, [session]);

  const fetchStreak = useCallback(async () => {
    const { data } = await supabase.from("habit_logs").select("completed_on");
    const dates = new Set((data ?? []).map((l) => l.completed_on as string));
    const s = computeStreak(dates);
    setStreak(s);
    return s;
  }, []);

  const fetchLogs = useCallback(async (date: string) => {
    const { data, error } = await supabase.from("habit_logs").select("habit_id").eq("completed_on", date);
    if (!error) setDone(new Set((data ?? []).map((l) => l.habit_id)));
  }, []);

  useFocusEffect(useCallback(() => {
    fetchHabits(selectedDate); fetchProfile(); fetchStreak();
    supabase.rpc("check_badges", { p_user_id: session?.user.id }).then(({ data }) => {
      const newBadges: string[] = data?.new_badges ?? [];
      if (newBadges.length > 0) setEarnedBadge({ key: newBadges[0], level: 0 });
    });
  }, [fetchHabits, fetchProfile, fetchStreak, selectedDate, session]));

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
    fetchProfile();
    const currentStreak = await fetchStreak();
    notifyStreakIfMilestone(currentStreak);

    // Update local completion count
    setHabits((prev) => prev.map((h) =>
      h.id === habit.id && h.duration_days
        ? { ...h, completionCount: (h.completionCount ?? 0) + 1 }
        : h
    ));

    if (data?.challenge_complete) {
      // Remove from list — challenge fully completed
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
    }

    // Check achievement badges after each completion
    const { data: badgeData } = await supabase.rpc("check_badges", { p_user_id: session?.user.id });
    const newBadges: string[] = badgeData?.new_badges ?? [];
    if (newBadges.length > 0) {
      setEarnedBadge({ key: newBadges[0], level: 0 });
      return;
    }

    if (data?.loot_label) {
      setPendingLevelUp(data.leveled_up ? data : null);
      if (data.loot_type === "free_reward") {
        const { count } = await supabase.from("rewards").select("id", { count: "exact", head: true }).eq("user_id", session?.user.id).eq("is_claimed", false);
        setHasRewards((count ?? 0) > 0);
      }
      setLoot({ label: data.loot_label, type: data.loot_type, value: data.loot_value });
    } else if (data?.leveled_up) {
      notifyLevelUp(data.level);
      if (data.badge_key) setEarnedBadge({ key: data.badge_key, level: data.level });
      else setLevelUpModal({ level: data.level, coins: data.coins_gained });
    } else {
      setEncourageMsg(ENCOURAGE_MESSAGES[Math.floor(Math.random() * ENCOURAGE_MESSAGES.length)]);
      setEncourageVisible(true);
    }
  }

  function confirmRemove(habit: Habit) {
    setConfirmTarget(habit);
  }

  async function removeHabit(habit: Habit) {
    let error: any;
    if (habit.source_habit_id) {
      // Leave challenge: hard delete + record leave so rejoin is blocked
      const [{ error: delErr }, { error: leaveErr }] = await Promise.all([
        supabase.from("habits").delete().eq("id", habit.id),
        supabase.from("challenge_leaves").insert({ user_id: session?.user.id, challenge_id: habit.source_habit_id }),
      ]);
      error = delErr ?? leaveErr;
    } else {
      ({ error } = await supabase.from("habits").delete().eq("id", habit.id));
    }
    if (error) { Alert.alert("Erreur", error.message); return; }
    setHabits((prev) => prev.filter((h) => h.id !== habit.id));
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

  const FILTERS = [
    { key: "all",       label: "Tous" },
    { key: "daily",     label: "Quotidien" },
    { key: "weekly",    label: "Hebdo" },
    { key: "challenge", label: "Challenges" },
  ] as const;

  const filteredHabits = habits.filter((h) => {
    if (filter === "all") return true;
    if (filter === "daily") return h.frequency === "daily" && !h.source_habit_id;
    if (filter === "weekly") return h.frequency === "weekly" && !h.source_habit_id;
    if (filter === "challenge") return !!h.source_habit_id;
    return true;
  });

  return (
    <View style={s.container}>
      {/* Blue header */}
      <View style={s.header}>
        <View style={s.topBar}>
          <Text style={s.pageTitle}>Mes habitudes</Text>
          <View style={s.topRight}>
            <View style={s.coinPill}>
              <CatCoin size={28} style={{ marginVertical: -4 }} />
              <Text style={s.coinText}>{coins}</Text>
            </View>
            <Pressable style={s.flamePill} onPress={() => setStreakOpen(true)}>
              <Ionicons name="flame" size={15} color="#f97316" />
              <Text style={s.flameText}>{streak}</Text>
            </Pressable>
          </View>
        </View>
        <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
      </View>

      {/* White content area */}
      <View style={s.content}>
        {/* Filter pills */}
        <View style={s.pillsRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[s.filterPill, filter === f.key && s.filterPillActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[s.filterPillText, filter === f.key && s.filterPillTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={filteredHabits}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 18, paddingTop: 8 }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>🌱</Text>
              <Text style={s.emptyText}>Aucune habitude.{"\n"}Appuie sur + pour commencer !</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isDone = done.has(item.id);
            const isChallenge = !!item.source_habit_id;
            const cardBg = isDone ? t.habitDone : isChallenge ? t.habitChallenge : t.habitNormal;
            const emoji = item.title.match(/^\p{Emoji}/u)?.[0] ?? (isChallenge ? "🏆" : "✨");
            const titleClean = item.title.replace(/^\p{Emoji}\s*/u, "");

            return (
              <Swipeable
                renderLeftActions={isChallenge ? undefined : () => renderLeftActions(item)}
                renderRightActions={() => renderRightActions(item)}
                overshootRight={false}
                overshootLeft={false}
              >
                <Pressable
                  style={[s.card, { backgroundColor: cardBg }, !isToday && s.cardPast]}
                  onPress={() => complete(item)}
                  disabled={isToday && isDone}
                >
                  {/* Arc gauge */}
                  <View style={s.arcWrap}>
                    <ArcGauge percent={isDone ? 1 : 0} color={isDone ? "#60a5fa" : isChallenge ? "#a78bfa" : "#f9a8d4"} size={62} />
                    <View style={s.arcCenter}>
                      {isDone
                        ? <Ionicons name="checkmark" size={18} color="#10b981" />
                        : <Ionicons name="ellipse-outline" size={18} color="#c4c4c4" />}
                    </View>
                  </View>

                  {/* Content */}
                  <View style={s.cardBody}>
                    <Text style={s.cardFreq}>{item.frequency === "daily" ? "Quotidien" : "Hebdomadaire"}</Text>
                    <Text style={[s.cardTitle, isDone && s.cardTitleDone]} numberOfLines={2}>{titleClean}</Text>
                    {item.duration_days && isChallenge ? (
                      <Text style={s.cardProgress}>{item.completionCount ?? 0}/{item.duration_days} jours</Text>
                    ) : null}
                    {item.packInfo ? (
                      <View style={[s.packChip, { borderColor: PACK_COLORS[item.packInfo.difficulty] ?? "#888" }]}>
                        <Ionicons name="gift-outline" size={11} color={PACK_COLORS[item.packInfo.difficulty] ?? "#888"} />
                        <Text style={[s.packText, { color: PACK_COLORS[item.packInfo.difficulty] ?? "#888" }]}>{item.packInfo.name}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Circle checkbox */}
                  <View style={[s.circle, isDone && s.circleDone]}>
                    {isDone && <Ionicons name="checkmark" size={18} color="white" />}
                  </View>
                </Pressable>
              </Swipeable>
            );
          }}
        />
      </View>

      <StreakModal visible={streakOpen} onClose={() => setStreakOpen(false)} />
      <ConfirmModal
        visible={!!confirmTarget}
        title={confirmTarget?.source_habit_id ? "Quitter le challenge ?" : "Supprimer ?"}
        message={confirmTarget?.source_habit_id
          ? `Tu pourras rejoindre « ${confirmTarget?.title} » depuis les Challenges.`
          : `Supprimer « ${confirmTarget?.title} » définitivement ?`}
        confirmLabel={confirmTarget?.source_habit_id ? "Quitter" : "Supprimer"}
        destructive
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => { if (confirmTarget) removeHabit(confirmTarget); setConfirmTarget(null); }}
      />
      <BadgeModal badgeKey={earnedBadge?.key ?? null} level={earnedBadge?.level ?? 0} onClose={() => setEarnedBadge(null)} />
      <LevelUpModal visible={!!levelUpModal} level={levelUpModal?.level ?? 1} coinsGained={levelUpModal?.coins ?? 0} onClose={() => { setLevelUpModal(null); fetchProfile(); }} />
      <LootModal loot={loot} hasRewards={hasRewards} onGoToShop={() => router.push("/(tabs)/shop")} onClose={async () => {
        setLoot(null);
        fetchProfile();
        if (pendingLevelUp) {
          const lu = pendingLevelUp;
          setPendingLevelUp(null);
          // RPC may not return badge_key in the loot path — check DB directly
          let badgeKey = lu.badge_key ?? null;
          if (!badgeKey) {
            const { data: badges } = await supabase
              .from("user_badges")
              .select("badge_key")
              .eq("user_id", session?.user.id)
              .eq("level", lu.level)
              .limit(1);
            badgeKey = badges?.[0]?.badge_key ?? null;
          }
          if (badgeKey) setEarnedBadge({ key: badgeKey, level: lu.level });
          else setLevelUpModal({ level: lu.level, coins: lu.coins_gained });
        }
      }} />
      <Modal
        visible={encourageVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEncourageVisible(false)}
      >
        <Pressable style={s.encOverlay} onPress={() => setEncourageVisible(false)}>
          <View style={s.encCard} onStartShouldSetResponder={() => true}>
            <Image
              source={require("../../../assets/images/happy-tsuya.png")}
              style={s.encMascot}
              resizeMode="contain"
            />
            <Text style={s.encTitle}>Bravo !</Text>
            <Text style={s.encMessage}>{encourageMsg}</Text>
            <Pressable style={s.encBtn} onPress={() => setEncourageVisible(false)}>
              <Text style={s.encBtnText}>Merci !</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.headerBg },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    // Header
    header: { backgroundColor: t.headerBg, paddingTop: 64, paddingHorizontal: 18, paddingBottom: 20 },
    topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    pageTitle: { fontSize: 26, fontWeight: "800", color: t.blueDark },
    topRight: { flexDirection: "row", gap: 8 },
    coinPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: t.pillBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    coinText: { color: t.blueDark, fontWeight: "700", fontSize: 14 },
    flamePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: t.pillBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    flameText: { color: "#ea580c", fontWeight: "700", fontSize: 14 },

    // Content area
    content: { flex: 1, backgroundColor: t.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 },

    // Filter pills
    pillsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 4 },
    filterPill: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 24, backgroundColor: t.surfaceAlt },
    filterPillActive: { backgroundColor: t.blueLight },
    filterPillText: { fontSize: 13, fontWeight: "600", color: t.textSecondary },
    filterPillTextActive: { color: t.blueDark, fontWeight: "800" },

    // Empty state
    emptyWrap: { alignItems: "center", marginTop: 48, gap: 10 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { textAlign: "center", color: t.textMuted, lineHeight: 22, fontSize: 14 },

    // Habit cards
    card: { borderRadius: 22, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
    cardPast: { opacity: 0.6 },
    arcWrap: { width: 62, height: 62, alignItems: "center", justifyContent: "center", position: "relative" },
    arcCenter: { position: "absolute" },
    cardBody: { flex: 1, gap: 3 },
    cardFreq: { fontSize: 11, fontWeight: "600", color: t.textSecondary },
    cardTitle: { fontSize: 15, fontWeight: "800", color: t.text, lineHeight: 21 },
    cardTitleDone: { textDecorationLine: "line-through", color: "#9ca3af" },
    cardProgress: { fontSize: 11, color: "#3b82f6", fontWeight: "600" },
    circle: { width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, borderColor: "#cbd5e1", alignItems: "center", justifyContent: "center" },
    circleDone: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
    packChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
    packText: { fontSize: 11, fontWeight: "700" },

    // Encouragement modal
    encOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: t.overlay, padding: 24 },
    encCard: { backgroundColor: t.card, borderRadius: 24, padding: 28, alignItems: "center", gap: 14, width: "100%" },
    encMascot: { width: 100, height: 100 },
    encTitle: { fontSize: 28, fontWeight: "900", color: t.text },
    encMessage: { fontSize: 15, color: t.textSecondary, textAlign: "center", lineHeight: 22, fontWeight: "500" },
    encBtn: { width: "100%", backgroundColor: t.actionBtn, borderRadius: 28, paddingVertical: 16, alignItems: "center" },
    encBtnText: { color: t.actionBtnText, fontSize: 16, fontWeight: "800" },

    // Swipe actions
    editBox: { backgroundColor: "#7c3aed", justifyContent: "center", alignItems: "center", width: 80, borderRadius: 22, gap: 4, marginBottom: 12 },
    deleteBox: { backgroundColor: "#ef4444", justifyContent: "center", alignItems: "center", width: 80, borderRadius: 22, gap: 4, marginBottom: 12 },
    swipeLabel: { color: "white", fontWeight: "600", fontSize: 11 },
  });
}
