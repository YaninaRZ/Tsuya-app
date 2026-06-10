import Heatmap from "@/components/Heatmap";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Profile = { pseudo: string; xp_total: number; level: number; role?: string };
type Badge = { id: string; level: number; badge_key: string; earned_at: string };

const AVATAR_COLORS = ["#6366f1","#ec4899","#f97316","#10b981","#3b82f6","#8b5cf6","#14b8a6"];
function avatarColor(pseudo: string) {
  let h = 0;
  for (let i = 0; i < pseudo.length; i++) h = pseudo.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function badgeLabel(level: number) {
  if (level === 2) return "Première montée";
  return `Niveau ${level}`;
}

export default function Profil() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editPseudo, setEditPseudo] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!session) return;
    const [{ data: profileData, error }, { data: badgesData }] = await Promise.all([
      supabase.from("profiles").select("pseudo, xp_total, level, role").eq("id", session.user.id).single(),
      supabase.from("user_badges").select("id, level, badge_key, earned_at").eq("user_id", session.user.id).order("level"),
    ]);
    if (!error) setProfile(profileData);
    setBadges(badgesData ?? []);
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  function openEdit() {
    setEditPseudo(profile?.pseudo ?? "");
    setEditOpen(true);
  }

  async function saveProfile() {
    if (!editPseudo.trim()) { Alert.alert("Oups", "Le pseudo ne peut pas être vide."); return; }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ pseudo: editPseudo.trim() })
      .eq("id", session?.user.id);
    setSaving(false);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setProfile((prev) => prev ? { ...prev, pseudo: editPseudo.trim() } : prev);
    setEditOpen(false);
  }

  if (loading)
    return <View style={s.center}><ActivityIndicator /></View>;

  const level = profile?.level ?? 1;
  const xpIntoLevel = profile ? profile.xp_total - (level - 1) * 100 : 0;
  const progress = Math.min(xpIntoLevel / 100, 1);
  const pseudo = profile?.pseudo ?? "?";
  const color = avatarColor(pseudo);

  return (
    <ScrollView contentContainerStyle={s.container}>

      {/* Avatar + stylo */}
      <View style={s.avatarWrap}>
        <View style={[s.avatarCircle, { backgroundColor: color }]}>
          <Text style={s.avatarInitial}>{pseudo.charAt(0).toUpperCase()}</Text>
        </View>
        <Pressable style={s.editBtn} onPress={openEdit}>
          <Ionicons name="pencil" size={14} color="white" />
        </Pressable>
      </View>

      <Text style={s.pseudo}>{pseudo}</Text>
      <Text style={s.level}>Niveau {level}</Text>

      {/* Barre de progression */}
      <View style={s.progressWrap}>
        <View style={s.progressHeader}>
          <Text style={s.progressLabel}>Progression</Text>
          <Text style={s.progressLabel}>{xpIntoLevel}/100 XP</Text>
        </View>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
        </View>
      </View>

      {/* Badges */}
      <View style={s.badgesSection}>
        <Text style={s.badgesTitle}>Badges</Text>
        {badges.length === 0 ? (
          <Text style={s.badgesEmpty}>Aucun badge pour l'instant — continue tes habitudes !</Text>
        ) : (
          <View style={s.badgesGrid}>
            {badges.map((badge) => (
              <View key={badge.id} style={s.badgeCard}>
                <View style={[s.badgeIconWrap, { backgroundColor: color + "22" }]}>
                  <Ionicons name="shield-checkmark" size={32} color={color} />
                </View>
                <Text style={[s.badgeLabel, { color }]}>{badgeLabel(badge.level)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Heatmap />

      {profile?.role === "admin" && (
        <Pressable style={s.adminBtn} onPress={() => router.push("/admin/packs" as any)}>
          <Ionicons name="settings-outline" size={16} color="#6366f1" />
          <Text style={s.adminBtnText}>Gérer les packs de récompenses</Text>
        </Pressable>
      )}

      <Pressable style={s.button} onPress={() => supabase.auth.signOut()}>
        <Text style={s.buttonText}>Se déconnecter</Text>
      </Pressable>

      {/* Modal édition */}
      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Modifier le profil</Text>
            <TextInput
              style={s.input}
              placeholder="Pseudo"
              value={editPseudo}
              onChangeText={setEditPseudo}
              autoCapitalize="none"
            />
            <View style={s.modalActions}>
              <Pressable style={[s.modalBtn, s.ghost]} onPress={() => setEditOpen(false)}>
                <Text style={s.ghostText}>Annuler</Text>
              </Pressable>
              <Pressable style={[s.modalBtn, s.primary]} onPress={saveProfile} disabled={saving}>
                <Text style={s.primaryText}>{saving ? "..." : "Enregistrer"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { alignItems: "center", padding: 24, paddingTop: 70, paddingBottom: 48, gap: 10, backgroundColor: "#ffffff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  avatarWrap: { position: "relative", marginBottom: 4 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "white", fontSize: 36, fontWeight: "800" },
  editBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },

  pseudo: { fontSize: 22, fontWeight: "700" },
  level: { fontSize: 16, color: "#6366f1", fontWeight: "600" },
  progressWrap: { width: "100%", gap: 6, marginTop: 4 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12, color: "#888" },
  progressBg: { height: 10, borderRadius: 5, backgroundColor: "#eee", overflow: "hidden" },
  progressFill: { height: 10, borderRadius: 5 },

  badgesSection: { width: "100%", marginTop: 8, gap: 10, alignItems: "center" },
  badgesTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  badgesEmpty: { color: "#9ca3af", fontSize: 13, textAlign: "center", lineHeight: 20 },
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  badgeCard: { alignItems: "center", gap: 6, backgroundColor: "#f9fafb", borderRadius: 14, padding: 14, width: 90 },
  badgeIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  badgeLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },

  adminBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#eef2ff", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#c7d2fe" },
  adminBtnText: { color: "#6366f1", fontWeight: "700", fontSize: 14 },
  button: { marginTop: 8, backgroundColor: "#ef4444", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  buttonText: { color: "white", fontWeight: "600" },

  modalBg: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalBox: { backgroundColor: "white", padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 14 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, fontSize: 15 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: "center" },
  ghost: { backgroundColor: "#f3f4f6" },
  ghostText: { color: "#555", fontWeight: "600" },
  primary: { backgroundColor: "#6366f1" },
  primaryText: { color: "white", fontWeight: "700" },
});
