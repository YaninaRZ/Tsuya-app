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

function Avatar({ pseudo, size = 26 }: { pseudo: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(pseudo), borderWidth: 1.5, borderColor: "white", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "white", fontSize: size * 0.36, fontWeight: "700" }}>{pseudo.charAt(0).toUpperCase()}</Text>
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
    setChallenges((publicHabits ?? []).map((h: any) => ({
      ...h,
      author: h.author ?? { pseudo: "?" },
      isOwn: h.user_id === session?.user.id,
      joined: myJoined.has(h.id),
      participants: participantsByHabit[h.id] ?? [],
    })));
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
    if (error) { Alert.alert("Erreur", error.message); return; }
    setChallenges((prev) => prev.map((c) => c.id === challenge.id ? { ...c, joined: true } : c));
    triggerRefresh();
    Alert.alert("Challenge rejoint !", `« ${challenge.title} » est dans ta liste.`);
  }

  if (loading)
    return <View style={s.center}><ActivityIndicator color="#3b82f6" /></View>;

  return (
    <View style={s.container}>
      <Text style={s.pageTitle}>Challenges</Text>
      <Text style={s.pageSub}>Habitudes publiques de la communauté</Text>

      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="trophy-outline" size={52} color="#e2e8f0" />
            <Text style={s.emptyText}>Aucun challenge disponible.{"\n"}Crée une habitude publique !</Text>
          </View>
        }
        renderItem={({ item }) => {
          return (
            <Pressable style={s.card} onPress={() => router.push(`/challenge/${item.id}` as any)}>
              <View style={s.cardBody}>
                <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={s.cardAuthor}>{item.author.pseudo}</Text>

                <View style={s.metaRow}>
                  <View style={s.metaChip}>
                    <Ionicons name="repeat" size={11} color="#64748b" />
                    <Text style={s.metaText}>{item.frequency === "daily" ? "Quotidien" : "Hebdo"}</Text>
                  </View>
                  <View style={s.metaChip}>
                    <Ionicons name="flash" size={11} color="#3b82f6" />
                    <Text style={[s.metaText, { color: "#3b82f6" }]}>+{item.xp_reward} XP</Text>
                  </View>
                  {item.duration_days ? (
                    <View style={s.metaChip}>
                      <Ionicons name="calendar-outline" size={11} color="#64748b" />
                      <Text style={s.metaText}>{item.duration_days}j</Text>
                    </View>
                  ) : null}
                </View>

                <View style={s.cardBottom}>
                  {/* Participants */}
                  {item.participants.length > 0 && (
                    <View style={s.partRow}>
                      {item.participants.slice(0, 4).map((p, i) => (
                        <View key={p.user_id} style={{ marginLeft: i === 0 ? 0 : -7, zIndex: 4 - i }}>
                          <Avatar pseudo={p.pseudo} size={22} />
                        </View>
                      ))}
                      <Text style={s.partCount}>{item.participants.length}</Text>
                    </View>
                  )}

                  {/* Status chip */}
                  <View style={[s.statusChip,
                    item.isOwn ? s.chipOwn : item.joined ? s.chipJoined : s.chipJoin
                  ]}>
                    <Text style={[s.statusText,
                      item.isOwn ? { color: "#7c3aed" } : item.joined ? { color: "#1d4ed8" } : { color: "#64748b" }
                    ]}>
                      {item.isOwn ? "Mon challenge" : item.joined ? "Rejoint ✓" : "Rejoindre"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Join button overlay — only for non-joined */}
              {!item.isOwn && !item.joined && (
                <Pressable
                  style={s.joinBtn}
                  onPress={() => join(item)}
                  disabled={joining === item.id}
                >
                  {joining === item.id
                    ? <ActivityIndicator color="white" size="small" />
                    : <Ionicons name="add" size={20} color="white" />}
                </Pressable>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingHorizontal: 20, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageTitle: { fontSize: 26, fontWeight: "800", color: "#0f172a" },
  pageSub: { color: "#94a3b8", fontSize: 13, fontWeight: "500", marginBottom: 20, marginTop: 2 },
  emptyWrap: { alignItems: "center", marginTop: 60, gap: 14 },
  emptyText: { textAlign: "center", color: "#94a3b8", lineHeight: 22, fontSize: 14 },

  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", lineHeight: 20 },
  cardAuthor: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 2 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#f8fafc", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  metaText: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  partRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  partCount: { fontSize: 11, color: "#94a3b8", fontWeight: "600", marginLeft: 4 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipJoin: { backgroundColor: "#f1f5f9" },
  chipJoined: { backgroundColor: "#dbeafe" },
  chipOwn: { backgroundColor: "#ede9fe" },
  statusText: { fontSize: 12, fontWeight: "700" },
  joinBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#3b82f6",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#3b82f6", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
});
