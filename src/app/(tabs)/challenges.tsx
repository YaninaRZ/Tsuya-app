import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/context/HabitsContext";
import { supabase } from "@/lib/supabase";
import { useTheme, type Theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import CatCoin from "@/components/CatCoin";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
  hasLeft: boolean;
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
  const t = useTheme();
  const s = makeStyles(t);
  const { session } = useAuth();
  const { triggerRefresh } = useHabits();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    const [{ data: publicHabits, error }, { data: myHabits }, { data: allJoined }, { data: myLeaves }] = await Promise.all([
      supabase.from("habits")
        .select(`id, title, description, xp_reward, frequency, duration_days, user_id, author:profiles!habits_user_id_fkey(pseudo)`)
        .eq("is_public", true).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("habits").select("source_habit_id").eq("user_id", session?.user.id).eq("is_active", true).not("source_habit_id", "is", null),
      supabase.from("habits").select(`source_habit_id, user_id, profile:profiles!habits_user_id_fkey(pseudo)`).not("source_habit_id", "is", null).eq("is_active", true),
      supabase.from("challenge_leaves").select("challenge_id").eq("user_id", session?.user.id),
    ]);
    if (error) { Alert.alert("Erreur", error.message); setLoading(false); return; }
    supabase.from("profiles").select("coins").eq("id", session?.user.id).single()
      .then(({ data: p }) => { if (p) setCoins(p.coins); });

    const myJoined = new Set((myHabits ?? []).map((h) => h.source_habit_id));
    const myLeftSet = new Set((myLeaves ?? []).map((l) => l.challenge_id));
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
      hasLeft: myLeftSet.has(h.id),
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

      {/* Header */}
      <View style={s.header}>
        <Text style={s.pageTitle}>Challenges</Text>
        <View style={s.coinPill}>
          <CatCoin size={28} style={{ marginVertical: -4 }} />
          <Text style={s.coinText}>{coins}</Text>
        </View>
      </View>

      {/* Hero banner */}
      <View style={s.banner}>
        <Image
          source={require("../../../assets/images/small-cat.png")}
          style={s.bannerCat}
          resizeMode="contain"
        />
        <View style={s.bannerText}>
          <Text style={s.bannerTitle}>Relève un défi,{"\n"}dépasse tes limites !</Text>
          <Text style={s.bannerSub}>Rejoins un challenge et gagne des récompenses</Text>
        </View>
      </View>

      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40, gap: 10, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="trophy-outline" size={52} color="#e2e8f0" />
            <Text style={s.emptyText}>Aucun challenge disponible.{"\n"}Crée une habitude publique !</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const cardBg = index % 2 === 0 ? t.challengeEven : t.challengeOdd;
          const illus = index % 2 === 0
            ? require("../../../assets/images/small-cat.png")
            : require("../../../assets/images/happy-tsuya.png");

          return (
            <Pressable style={[s.card, { backgroundColor: cardBg }]} onPress={() => router.push(`/challenge/${item.id}` as any)}>

              {/* Left content */}
              <View style={s.cardLeft}>
                <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={s.cardAuthor}>par {item.author.pseudo}</Text>

                {/* Participants */}
                <View style={s.partRow}>
                  {item.participants.slice(0, 3).map((p, i) => (
                    <View key={p.user_id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }}>
                      <Avatar pseudo={p.pseudo} size={26} />
                    </View>
                  ))}
                  {item.participants.length > 0 && (
                    <Text style={s.partCount}>
                      {item.participants.length} participant{item.participants.length > 1 ? "s" : ""}
                    </Text>
                  )}
                </View>

                {/* Action button */}
                <View style={s.cardBottomRow}>
                  {item.isOwn ? (
                    <View style={[s.actionBtn, s.btnOwn]}>
                      <Text style={[s.actionBtnText, { color: "#7c3aed" }]}>Mon challenge</Text>
                    </View>
                  ) : item.joined ? (
                    <View style={[s.actionBtn, s.btnJoined]}>
                      <Ionicons name="checkmark-circle" size={14} color="#1d4ed8" />
                      <Text style={[s.actionBtnText, { color: "#1d4ed8" }]}>Rejoint ✓</Text>
                    </View>
                  ) : item.hasLeft ? (
                    <View style={[s.actionBtn, s.btnLeft]}>
                      <Text style={[s.actionBtnText, { color: "#9ca3af" }]}>Quitté</Text>
                    </View>
                  ) : (
                    <Pressable style={[s.actionBtn, s.btnJoin]} onPress={() => join(item)} disabled={joining === item.id}>
                      {joining === item.id
                        ? <ActivityIndicator color="white" size="small" />
                        : <Text style={[s.actionBtnText, { color: "white" }]}>Rejoindre</Text>}
                    </Pressable>
                  )}

                  {item.duration_days ? (
                    <View style={s.durationPill}>
                      <Text style={s.durationText}>{item.duration_days} jours</Text>
                    </View>
                  ) : (
                    <View style={s.durationPill}>
                      <Text style={s.durationText}>+{item.xp_reward} XP</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Right illustration */}
              <Image source={illus} style={s.cardIllus} resizeMode="contain" />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background, paddingTop: 72 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
    pageTitle: { fontSize: 26, fontWeight: "800", color: t.text },
    coinPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: t.card, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: t.border },
    coinText: { color: t.blueDark, fontWeight: "700", fontSize: 14 },

    banner: { marginHorizontal: 20, marginBottom: 16, backgroundColor: t.headerBg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 12 },
    bannerCat: { width: 64, height: 64 },
    bannerText: { flex: 1, gap: 4 },
    bannerTitle: { fontSize: 15, fontWeight: "800", color: t.blueDark, lineHeight: 21 },
    bannerSub: { fontSize: 11, color: "#3b82f6", fontWeight: "500" },

    emptyWrap: { alignItems: "center", marginTop: 60, gap: 14 },
    emptyText: { textAlign: "center", color: t.textMuted, lineHeight: 22, fontSize: 14 },

    card: {
      borderRadius: 22,
      padding: 18,
      flexDirection: "row",
      alignItems: "flex-start",
      overflow: "hidden",
    },
    cardLeft: { flex: 1, gap: 6, paddingRight: 8 },
    cardTitle: { fontSize: 18, fontWeight: "800", color: t.text, lineHeight: 24 },
    cardAuthor: { fontSize: 12, color: t.textSecondary, fontWeight: "500" },
    partRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    partCount: { fontSize: 12, color: t.textSecondary, fontWeight: "600", marginLeft: 6 },
    cardBottomRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
    actionBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 5, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20,
    },
    actionBtnText: { fontSize: 13, fontWeight: "700" },
    btnJoin: { backgroundColor: t.actionBtn },
    btnJoined: { backgroundColor: t.blueLight },
    btnLeft: { backgroundColor: t.ghostBg },
    btnOwn: { backgroundColor: t.habitChallenge },
    durationPill: { backgroundColor: "rgba(0,0,0,0.08)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    durationText: { fontSize: 12, fontWeight: "700", color: t.textSecondary },
    cardIllus: { width: 90, height: 90, marginTop: -4 },
  });
}
