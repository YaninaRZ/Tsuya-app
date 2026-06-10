import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/context/HabitsContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  frequency: string;
  duration_days: number | null;
  author: { pseudo: string };
  isOwn: boolean;
  joined: boolean;
  participants: { user_id: string; pseudo: string }[];
};

const AVATAR_COLORS = ["#6366f1","#ec4899","#f97316","#10b981","#3b82f6","#8b5cf6","#14b8a6"];
function avatarColor(pseudo: string) {
  let h = 0;
  for (let i = 0; i < pseudo.length; i++) h = pseudo.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function Avatar({ pseudo }: { pseudo: string }) {
  return (
    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: avatarColor(pseudo), borderWidth: 1.5, borderColor: "white", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "white", fontSize: 9, fontWeight: "700" }}>{pseudo.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function Challenges() {
  const { session } = useAuth();
  const { triggerRefresh } = useHabits();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const fetchChallenges = useCallback(async () => {
    setLoading(true);

    const [{ data: publicHabits, error }, { data: myHabits }, { data: allJoined }] = await Promise.all([
      supabase.from("habits")
        .select(`id, title, description, xp_reward, frequency, duration_days, user_id, author:profiles!habits_user_id_fkey(pseudo)`)
        .eq("is_public", true).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("habits").select("source_habit_id").eq("user_id", session?.user.id).eq("is_active", true).not("source_habit_id", "is", null),
      supabase.from("habits").select(`source_habit_id, user_id, profile:profiles!habits_user_id_fkey(pseudo)`).not("source_habit_id", "is", null).eq("is_active", true),
    ]);

    if (error) { Alert.alert("Erreur", error.message); setLoading(false); return; }

    const myJoined = new Set((myHabits ?? []).map((h) => h.source_habit_id));

    const participantsByHabit: Record<string, { user_id: string; pseudo: string }[]> = {};
    for (const row of (allJoined ?? []) as any[]) {
      if (!participantsByHabit[row.source_habit_id]) participantsByHabit[row.source_habit_id] = [];
      participantsByHabit[row.source_habit_id].push({ user_id: row.user_id, pseudo: row.profile?.pseudo ?? "?" });
    }

    setChallenges(
      (publicHabits ?? []).map((h: any) => ({
        ...h,
        author: h.author ?? { pseudo: "?" },
        isOwn: h.user_id === session?.user.id,
        joined: myJoined.has(h.id),
        participants: participantsByHabit[h.id] ?? [],
      }))
    );
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { fetchChallenges(); }, [fetchChallenges]));

  async function join(challenge: Challenge) {
    setJoining(challenge.id);
    const { error } = await supabase.from("habits").insert({
      user_id: session?.user.id,
      title: challenge.title,
      description: challenge.description,
      xp_reward: challenge.xp_reward,
      frequency: challenge.frequency,
      duration_days: challenge.duration_days,
      is_public: false,
      source_habit_id: challenge.id,
    });
    setJoining(null);

    if (error) {
      Alert.alert("Erreur", error.message);
      return;
    }

    setChallenges((prev) =>
      prev.map((c) => (c.id === challenge.id ? { ...c, joined: true } : c))
    );
    triggerRefresh();
    Alert.alert("Challenge rejoint !", `« ${challenge.title} » est dans ta liste.`);
  }

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color="#6366f1" />
      </View>
    );

  return (
    <View style={s.container}>
      <Text style={s.title}>Challenges 🏆</Text>
      <Text style={s.sub}>Habitudes publiques de la communauté</Text>

      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="trophy-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyText}>
              Aucun challenge disponible pour l'instant.{"\n"}
              Crée une habitude publique pour lancer le mouvement !
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => router.push(`/challenge/${item.id}` as any)}>
            <View style={s.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardAuthor}>par {item.author.pseudo}</Text>
              </View>
              <View style={s.xpBadge}>
                <Text style={s.xpText}>+{item.xp_reward} XP</Text>
              </View>
            </View>

            {item.description ? (
              <Text style={s.cardDesc}>{item.description}</Text>
            ) : null}

            <View style={s.cardMeta}>
              <View style={s.metaChip}>
                <Ionicons name="repeat" size={13} color="#6366f1" />
                <Text style={s.metaText}>
                  {item.frequency === "daily" ? "Quotidien" : "Hebdo"}
                </Text>
              </View>
              {item.duration_days ? (
                <View style={s.metaChip}>
                  <Ionicons name="calendar-outline" size={13} color="#6366f1" />
                  <Text style={s.metaText}>{item.duration_days} jours</Text>
                </View>
              ) : null}
            </View>

            {/* Participants */}
            {item.participants.length > 0 && (
              <View style={s.partRow}>
                {item.participants.slice(0, 5).map((p, i) => (
                  <View key={p.user_id} style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 5 - i }}>
                    <Avatar pseudo={p.pseudo} />
                  </View>
                ))}
                <Text style={s.partCount}>
                  {item.participants.length} participant{item.participants.length > 1 ? "s" : ""}
                </Text>
              </View>
            )}

            <Pressable
              style={[
                s.joinBtn,
                item.isOwn && s.joinBtnOwn,
                item.joined && s.joinBtnDone,
              ]}
              onPress={() => !item.joined && !item.isOwn && join(item)}
              disabled={item.joined || item.isOwn || joining === item.id}
            >
              {joining === item.id ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={
                      item.isOwn
                        ? "person"
                        : item.joined
                        ? "checkmark-circle"
                        : "add-circle-outline"
                    }
                    size={18}
                    color="white"
                  />
                  <Text style={s.joinText}>
                    {item.isOwn ? "Mon challenge" : item.joined ? "Rejoint" : "Rejoindre"}
                  </Text>
                </>
              )}
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  sub: { color: "#888", fontSize: 14, marginBottom: 20 },
  emptyWrap: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { textAlign: "center", color: "#888", lineHeight: 22 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardAuthor: { color: "#6366f1", fontSize: 13, fontWeight: "600", marginTop: 2 },
  cardDesc: { color: "#666", fontSize: 14, lineHeight: 20 },
  xpBadge: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  xpText: { color: "#6366f1", fontWeight: "700", fontSize: 13 },
  cardMeta: { flexDirection: "row", gap: 8 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f4f4f5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  metaText: { color: "#555", fontSize: 12, fontWeight: "600" },
  joinBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  joinBtnDone: { backgroundColor: "#22c55e" },
  joinBtnOwn: { backgroundColor: "#a855f7" },
  partRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  partCount: { color: "#9ca3af", fontSize: 12, fontWeight: "600" },
  joinText: { color: "white", fontWeight: "700", fontSize: 14 },
});
