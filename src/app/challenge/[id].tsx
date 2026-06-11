import ConfirmModal from "@/components/ConfirmModal";
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

type Participant = { user_id: string; pseudo: string };

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#f97316", "#10b981", "#3b82f6", "#8b5cf6", "#14b8a6"];

function avatarColor(pseudo: string) {
  let hash = 0;
  for (let i = 0; i < pseudo.length; i++) hash = pseudo.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ pseudo, size = 36, border = true }: { pseudo: string; size?: number; border?: boolean }) {
  return (
    <View style={[
      av.circle,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(pseudo) },
      border && av.border,
    ]}>
      <Text style={[av.initial, { fontSize: size * 0.38 }]}>
        {pseudo.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const av = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  border: { borderWidth: 2, borderColor: "white" },
  initial: { color: "white", fontWeight: "700" },
});

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { triggerRefresh } = useHabits();
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);
  const [isOwn, setIsOwn] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data, error }, { data: parts }] = await Promise.all([
        supabase
          .from("habits")
          .select(`id, title, description, xp_reward, frequency, duration_days, user_id, author:profiles!habits_user_id_fkey(pseudo)`)
          .eq("id", id)
          .single(),
        supabase
          .from("habits")
          .select(`user_id, profile:profiles!habits_user_id_fkey(pseudo)`)
          .eq("source_habit_id", id)
          .eq("is_active", true),
      ]);

      if (error || !data) { Alert.alert("Erreur", "Challenge introuvable."); router.back(); return; }

      const own = data.user_id === session?.user.id;
      setIsOwn(own);
      setChallenge({ ...data, author: (data as any).author ?? { pseudo: "?" } });
      setParticipants(
        (parts ?? []).map((p: any) => ({ user_id: p.user_id, pseudo: p.profile?.pseudo ?? "?" }))
      );

      if (!own) {
        const [{ data: mine }, { data: leftRow }] = await Promise.all([
          supabase.from("habits").select("id").eq("user_id", session?.user.id).eq("source_habit_id", id).eq("is_active", true).maybeSingle(),
          supabase.from("challenge_leaves").select("challenge_id").eq("user_id", session?.user.id).eq("challenge_id", id).maybeSingle(),
        ]);
        setJoined(!!mine);
        setHasLeft(!!leftRow);
      }

      setLoading(false);
    }
    load();
  }, [id, session]);

  async function join() {
    if (!challenge) return;
    setJoining(true);

    // Block rejoin if previously left
    const { data: leftRow } = await supabase
      .from("challenge_leaves").select("challenge_id")
      .eq("user_id", session?.user.id)
      .eq("challenge_id", challenge.id)
      .maybeSingle();

    if (leftRow) {
      setJoining(false);
      setHasLeft(true);
      Alert.alert("Non autorisé", "Tu as déjà quitté ce challenge.");
      return;
    }

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
    setParticipants((prev) => {
      if (prev.some((p) => p.user_id === session!.user.id)) return prev;
      return [...prev, { user_id: session!.user.id, pseudo: "Toi" }];
    });
    triggerRefresh();
    Alert.alert("Challenge rejoint !", `« ${challenge.title} » est dans ta liste.`);
  }

  function confirmLeave() {
    setShowLeaveConfirm(true);
  }

  async function leave() {
    if (!challenge) return;
    setJoining(true);
    // Hard delete the joined habit + record the leave so rejoin is blocked
    const [{ error }, { error: leaveErr }] = await Promise.all([
      supabase.from("habits").delete()
        .eq("user_id", session?.user.id)
        .eq("source_habit_id", challenge.id),
      supabase.from("challenge_leaves").insert({ user_id: session?.user.id, challenge_id: challenge.id }),
    ]);
    setJoining(false);
    if (error || leaveErr) { Alert.alert("Erreur", (error ?? leaveErr)!.message); return; }
    setJoined(false);
    setHasLeft(true);
    setParticipants((prev) => prev.filter((p) => p.user_id !== session?.user.id));
    triggerRefresh();
  }

  if (loading)
    return <View style={s.center}><ActivityIndicator color="#6366f1" size="large" /></View>;

  if (!challenge) return null;


  const freqLabel = challenge.frequency === "daily" ? "Quotidien" : "Hebdomadaire";
  const shown = participants.slice(0, 5);
  const extra = participants.length - shown.length;

  return (
    <>
    <ConfirmModal
      visible={showLeaveConfirm}
      title="Quitter le challenge ?"
      message="Tu pourras le rejoindre à nouveau depuis les Challenges."
      confirmLabel="Quitter"
      destructive
      onCancel={() => setShowLeaveConfirm(false)}
      onConfirm={() => { setShowLeaveConfirm(false); leave(); }}
    />
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Pressable style={s.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#6366f1" />
        <Text style={s.backText}>Challenges</Text>
      </Pressable>

      <View style={s.hero}>
        <View style={s.heroIcon}>
          <Ionicons name="trophy" size={40} color="#6366f1" />
        </View>
        <Text style={s.heroTitle}>{challenge.title}</Text>
        <Text style={s.heroAuthor}>par {challenge.author.pseudo}</Text>
      </View>

      <View style={s.chips}>
        <View style={s.chip}><Ionicons name="repeat" size={15} color="#6366f1" /><Text style={s.chipText}>{freqLabel}</Text></View>
        <View style={s.chip}><Ionicons name="flash" size={15} color="#6366f1" /><Text style={s.chipText}>+{challenge.xp_reward} XP</Text></View>
        {challenge.duration_days ? (
          <View style={s.chip}><Ionicons name="calendar-outline" size={15} color="#6366f1" /><Text style={s.chipText}>{challenge.duration_days} jours</Text></View>
        ) : null}
      </View>

      {/* Participants */}
      <View style={s.participantsBox}>
        <View style={s.avatarRow}>
          {shown.map((p, i) => (
            <View key={p.user_id} style={[s.avatarSlot, { zIndex: shown.length - i, marginLeft: i === 0 ? 0 : -10 }]}>
              <Avatar pseudo={p.pseudo} size={36} />
            </View>
          ))}
          {extra > 0 && (
            <View style={[s.avatarSlot, s.avatarExtra, { marginLeft: -10 }]}>
              <Text style={s.avatarExtraText}>+{extra}</Text>
            </View>
          )}
        </View>
        <Text style={s.participantsCount}>
          {participants.length === 0
            ? "Aucun participant pour l'instant"
            : `${participants.length} participant${participants.length > 1 ? "s" : ""}`}
        </Text>
      </View>

      {challenge.description ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Description</Text>
          <Text style={s.sectionBody}>{challenge.description}</Text>
        </View>
      ) : null}

      {isOwn ? (
        <View style={[s.joinBtn, s.joinBtnOwn]}>
          <Ionicons name="person" size={20} color="white" />
          <Text style={s.joinText}>C'est ton challenge</Text>
        </View>
      ) : joined ? (
        <Pressable style={[s.joinBtn, s.leaveBtn]} onPress={confirmLeave} disabled={joining}>
          {joining ? <ActivityIndicator color="white" /> : (
            <><Ionicons name="exit-outline" size={20} color="white" /><Text style={s.joinText}>Quitter ce challenge</Text></>
          )}
        </Pressable>
      ) : hasLeft ? (
        <View style={[s.joinBtn, s.leftBtn]}>
          <Ionicons name="close-circle-outline" size={20} color="#6b7280" />
          <Text style={[s.joinText, { color: "#6b7280" }]}>Challenge quitté</Text>
        </View>
      ) : (
        <Pressable style={s.joinBtn} onPress={join} disabled={joining}>
          {joining ? <ActivityIndicator color="white" /> : (
            <><Ionicons name="add-circle-outline" size={20} color="white" /><Text style={s.joinText}>Rejoindre ce challenge</Text></>
          )}
        </Pressable>
      )}
    </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24, paddingTop: 60, gap: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  backText: { color: "#6366f1", fontWeight: "600", fontSize: 15 },
  hero: { alignItems: "center", gap: 10, marginVertical: 8 },
  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  heroAuthor: { color: "#6366f1", fontWeight: "600", fontSize: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eef2ff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipText: { color: "#6366f1", fontWeight: "700", fontSize: 14 },
  participantsBox: { alignItems: "center", gap: 8 },
  avatarRow: { flexDirection: "row", alignItems: "center" },
  avatarSlot: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  avatarExtra: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e5e7eb", borderWidth: 2, borderColor: "white", alignItems: "center", justifyContent: "center" },
  avatarExtraText: { fontSize: 11, fontWeight: "700", color: "#6b7280" },
  participantsCount: { fontSize: 13, color: "#9ca3af", fontWeight: "600" },
  section: { gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#333" },
  sectionBody: { fontSize: 15, color: "#555", lineHeight: 22 },
  joinBtn: { backgroundColor: "#6366f1", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  leaveBtn: { backgroundColor: "#ef4444" },
  leftBtn: { backgroundColor: "#f3f4f6" },
  joinBtnOwn: { backgroundColor: "#a855f7" },
  joinText: { color: "white", fontWeight: "700", fontSize: 16 },
});
