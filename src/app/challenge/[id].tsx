import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/context/HabitsContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ChallengeDetail = {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  frequency: string;
  duration_days: number | null;
  user_id: string;
  author: { pseudo: string };
};

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { triggerRefresh } = useHabits();
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [isOwn, setIsOwn] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from("habits")
        .select(`
          id, title, description, xp_reward, frequency, duration_days, user_id,
          author:profiles!habits_user_id_fkey(pseudo)
        `)
        .eq("id", id)
        .single();

      if (error || !data) {
        Alert.alert("Erreur", "Challenge introuvable.");
        router.back();
        return;
      }

      const own = data.user_id === session?.user.id;
      setIsOwn(own);
      setChallenge({ ...data, author: (data as any).author ?? { pseudo: "?" } });

      if (!own) {
        const { data: mine } = await supabase
          .from("habits")
          .select("id")
          .eq("user_id", session?.user.id)
          .eq("title", data.title)
          .eq("is_active", true)
          .maybeSingle();
        setJoined(!!mine);
      }

      setLoading(false);
    }
    fetch();
  }, [id, session]);

  async function join() {
    if (!challenge) return;
    setJoining(true);
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
    setJoining(false);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setJoined(true);
    triggerRefresh();
    Alert.alert("Challenge rejoint !", `« ${challenge.title} » est dans ta liste.`);
  }

  function confirmLeave() {
    Alert.alert(
      "Quitter le challenge ?",
      `Tu pourras le rejoindre à nouveau depuis les Challenges.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Quitter", style: "destructive", onPress: leave },
      ],
    );
  }

  async function leave() {
    if (!challenge) return;
    setJoining(true);
    const { error } = await supabase
      .from("habits")
      .delete()
      .eq("user_id", session?.user.id)
      .eq("source_habit_id", challenge.id);
    setJoining(false);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setJoined(false);
    triggerRefresh();
  }

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );

  if (!challenge) return null;

  const freqLabel = challenge.frequency === "daily" ? "Quotidien" : "Hebdomadaire";

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Header */}
      <Pressable style={s.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#6366f1" />
        <Text style={s.backText}>Challenges</Text>
      </Pressable>

      {/* Hero */}
      <View style={s.hero}>
        <View style={s.heroIcon}>
          <Ionicons name="trophy" size={40} color="#6366f1" />
        </View>
        <Text style={s.heroTitle}>{challenge.title}</Text>
        <Text style={s.heroAuthor}>par {challenge.author.pseudo}</Text>
      </View>

      {/* Chips */}
      <View style={s.chips}>
        <View style={s.chip}>
          <Ionicons name="repeat" size={15} color="#6366f1" />
          <Text style={s.chipText}>{freqLabel}</Text>
        </View>
        <View style={s.chip}>
          <Ionicons name="flash" size={15} color="#6366f1" />
          <Text style={s.chipText}>+{challenge.xp_reward} XP</Text>
        </View>
        {challenge.duration_days ? (
          <View style={s.chip}>
            <Ionicons name="calendar-outline" size={15} color="#6366f1" />
            <Text style={s.chipText}>{challenge.duration_days} jours</Text>
          </View>
        ) : null}
      </View>

      {/* Description */}
      {challenge.description ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Description</Text>
          <Text style={s.sectionBody}>{challenge.description}</Text>
        </View>
      ) : null}

      {/* Bouton */}
      {isOwn ? (
        <View style={[s.joinBtn, s.joinBtnOwn]}>
          <Ionicons name="person" size={20} color="white" />
          <Text style={s.joinText}>C'est ton challenge</Text>
        </View>
      ) : joined ? (
        <Pressable style={[s.joinBtn, s.leaveBtn]} onPress={confirmLeave} disabled={joining}>
          {joining ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="exit-outline" size={20} color="white" />
              <Text style={s.joinText}>Quitter ce challenge</Text>
            </>
          )}
        </Pressable>
      ) : (
        <Pressable style={s.joinBtn} onPress={join} disabled={joining}>
          {joining ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text style={s.joinText}>Rejoindre ce challenge</Text>
            </>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24, paddingTop: 60, gap: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  backText: { color: "#6366f1", fontWeight: "600", fontSize: 15 },
  hero: { alignItems: "center", gap: 10, marginVertical: 8 },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  heroAuthor: { color: "#6366f1", fontWeight: "600", fontSize: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eef2ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: { color: "#6366f1", fontWeight: "700", fontSize: 14 },
  section: { gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#333" },
  sectionBody: { fontSize: 15, color: "#555", lineHeight: 22 },
  joinBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  joinBtnDone: { backgroundColor: "#22c55e" },
  leaveBtn: { backgroundColor: "#ef4444" },
  joinBtnOwn: { backgroundColor: "#a855f7" },
  joinText: { color: "white", fontWeight: "700", fontSize: 16 },
});
