import Heatmap from "@/components/Heatmap";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Profile = { pseudo: string; xp_total: number; level: number };

export default function Profil() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("pseudo, xp_total, level")
      .eq("id", session.user.id)
      .single();
    if (!error) setProfile(data);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );

  const level = profile?.level ?? 1;
  const xpIntoLevel = profile ? profile.xp_total - (level - 1) * 100 : 0;
  const progress = Math.min(xpIntoLevel / 100, 1);

  return (
    <View style={s.container}>
      <Text style={s.pseudo}>{profile?.pseudo}</Text>
      <Text style={s.level}>Niveau {level}</Text>

      <View style={s.progressWrap}>
        <View style={s.progressHeader}>
          <Text style={s.progressLabel}>Progression</Text>
          <Text style={s.progressLabel}>{xpIntoLevel}/100 XP</Text>
        </View>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <Heatmap />

      <Pressable style={s.button} onPress={() => supabase.auth.signOut()}>
        <Text style={s.buttonText}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 24,
    paddingTop: 80,
    gap: 10,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pseudo: { fontSize: 22, fontWeight: "700" },
  level: { fontSize: 18, color: "#6366f1", fontWeight: "600" },
  progressWrap: { width: "100%", gap: 6, marginTop: 8 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12, color: "#888" },
  progressBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#eee",
    overflow: "hidden",
  },
  progressFill: { height: 10, borderRadius: 5, backgroundColor: "#6366f1" },
  button: {
    marginTop: "auto",
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: { color: "white", fontWeight: "600" },
});
