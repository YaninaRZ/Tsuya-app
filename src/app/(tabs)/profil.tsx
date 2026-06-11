import Heatmap from "@/components/Heatmap";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import CatCoin from "@/components/CatCoin";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Profile = { pseudo: string; xp_total: number; level: number; coins: number; role?: string; banner_url?: string | null };
type PredefinedBanner = { id: string; name: string; url: string };
type Stats = { activeDays: number; habitsCount: number; challengesDone: number; totalCompletions: number };
type Badge = { id: string; level: number; badge_key: string; earned_at: string };

type BadgeDef = { key: string; label: string; description: string; greyImage: any; colorImage: any };

const BADGE_CATALOG: BadgeDef[] = [
  { key: "blue-paw",     label: "Premier pas",     description: "Première habitude cochée",             greyImage: require("../../../assets/images/badges/grey-blue-paw-badge.png"),       colorImage: require("../../../assets/images/badges/blue-paw-badge.png") },
  { key: "cats-blue",    label: "Challenge créé",  description: "Création d'une habitude publique",     greyImage: require("../../../assets/images/badges/grey-cats-blue-badge.png"),      colorImage: require("../../../assets/images/badges/cats-blue-badge.png") },
  { key: "coins-fish",   label: "Riche en coins",  description: "100 premiers coins gagnés",            greyImage: require("../../../assets/images/badges/grey-coins-fish-badge.png"),     colorImage: require("../../../assets/images/badges/coins-fish-badge.png") },
  { key: "green-jungle", label: "Jungle verte",    description: "7 habitudes validées",                 greyImage: require("../../../assets/images/badges/grey-green-jungle-badge.png"),   colorImage: require("../../../assets/images/badges/green-jungle-badge.png") },
  { key: "money-jungle", label: "Grand dépensier", description: "1000 pièces dépensées",                greyImage: require("../../../assets/images/badges/grey-money-jungle-badge.png"),   colorImage: require("../../../assets/images/badges/money-jungle-badge.png") },
  { key: "sleep-cat",    label: "Flemme royale",   description: "3 jours d'inactivité",                 greyImage: require("../../../assets/images/badges/grey-sleep-cat-badge.png"),      colorImage: require("../../../assets/images/badges/sleep-cat-badge.png") },
  { key: "sun-cat",      label: "Soleil levant",   description: "5 jours d'activité consécutifs",       greyImage: require("../../../assets/images/badges/grey-sun-cat-badge.png"),        colorImage: require("../../../assets/images/badges/sun-cat-badge.png") },
  { key: "two-cat",      label: "Populaire",       description: "10 membres ont rejoint mon challenge",  greyImage: require("../../../assets/images/badges/grey-two-cat-badge.png"),        colorImage: require("../../../assets/images/badges/two-cat-badge.png") },
  { key: "two-paws",     label: "Nouveau look",    description: "Modification du banner profil",        greyImage: require("../../../assets/images/badges/grey-two-paws-check-badge.png"), colorImage: require("../../../assets/images/badges/two-paws-check-badge.png") },
];

const AVATAR_COLORS = ["#6366f1","#ec4899","#f97316","#10b981","#3b82f6","#8b5cf6","#14b8a6"];
function avatarColor(pseudo: string) {
  let h = 0;
  for (let i = 0; i < pseudo.length; i++) h = pseudo.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const BANNER_COLORS = [["#3b82f6", "#6366f1"], ["#8b5cf6", "#ec4899"], ["#10b981", "#3b82f6"], ["#f97316", "#ec4899"]];
function bannerColors(pseudo: string): [string, string] {
  let h = 0;
  for (let i = 0; i < pseudo.length; i++) h = pseudo.charCodeAt(i) + ((h << 5) - h);
  return BANNER_COLORS[Math.abs(h) % BANNER_COLORS.length] as [string, string];
}

export default function Profil() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ activeDays: 0, habitsCount: 0, challengesDone: 0, totalCompletions: 0 });
  const [predefinedBanners, setPredefinedBanners] = useState<PredefinedBanner[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editPseudo, setEditPseudo] = useState("");
  const [editBannerUrl, setEditBannerUrl] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!session) return;
    const [{ data: profileData }, { data: badgesData }, { data: logs }, { data: habits }, { data: challenges }, { data: bannersData }] = await Promise.all([
      supabase.from("profiles").select("pseudo, xp_total, level, coins, role, banner_url").eq("id", session.user.id).single(),
      supabase.from("user_badges").select("id, level, badge_key, earned_at").eq("user_id", session.user.id).order("level"),
      supabase.from("habit_logs").select("completed_on").eq("user_id", session.user.id),
      supabase.from("habits").select("id").eq("user_id", session.user.id).eq("is_active", true).is("source_habit_id", null),
      supabase.from("habit_logs").select("habit_id, habits!inner(source_habit_id)").eq("user_id", session.user.id).not("habits.source_habit_id", "is", null),
      supabase.from("profile_banners").select("id, name, url").order("created_at"),
    ]);
    setPredefinedBanners(bannersData ?? []);
    if (profileData) setProfile(profileData);
    setBadges(badgesData ?? []);

    const uniqueDays = new Set((logs ?? []).map((l) => l.completed_on)).size;
    const uniqueChallenges = new Set((challenges ?? []).map((c: any) => c.habits?.source_habit_id)).size;
    setStats({
      activeDays: uniqueDays,
      habitsCount: (habits ?? []).length,
      challengesDone: uniqueChallenges,
      totalCompletions: (logs ?? []).length,
    });
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  async function pickBanner() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 1],
    });
    if (result.canceled) return;
    setUploadingBanner(true);
    const asset = result.assets[0];
    const ext = asset.uri.split(".").pop() ?? "jpg";
    const path = `${session?.user.id}/${Date.now()}.${ext}`;
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const { error: uploadErr } = await supabase.storage.from("banners").upload(path, blob, { contentType: `image/${ext}`, upsert: true });
    setUploadingBanner(false);
    if (uploadErr) { Alert.alert("Erreur upload", uploadErr.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(path);
    setEditBannerUrl(publicUrl);
  }

  async function saveProfile() {
    if (!editPseudo.trim()) { Alert.alert("Oups", "Le pseudo ne peut pas être vide."); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ pseudo: editPseudo.trim(), banner_url: editBannerUrl }).eq("id", session?.user.id);
    setSaving(false);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setProfile((prev) => prev ? { ...prev, pseudo: editPseudo.trim(), banner_url: editBannerUrl } : prev);
    setEditOpen(false);
    supabase.rpc("check_badges", { p_user_id: session?.user.id });
    fetchProfile();
  }

  if (loading) return <View style={s.center}><ActivityIndicator /></View>;

  const level = profile?.level ?? 1;
  const coins = profile?.coins ?? 0;
  const xpIntoLevel = profile ? profile.xp_total - (level - 1) * 100 : 0;
  const progress = Math.min(xpIntoLevel / 100, 1);
  const pseudo = profile?.pseudo ?? "?";
  const color = avatarColor(pseudo);
  const [bannerA, bannerB] = bannerColors(pseudo);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

      {/* Banner */}
      <View style={[s.banner, { backgroundColor: bannerA }]}>
        {profile?.banner_url
          ? <Image source={{ uri: profile.banner_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <>
              <View style={[s.deco1, { backgroundColor: bannerB + "66" }]} />
              <View style={[s.deco2, { backgroundColor: bannerB + "44" }]} />
              <View style={[s.deco3, { backgroundColor: bannerA + "88" }]} />
            </>
        }
        {/* Settings + admin icons top right */}
        <View style={s.bannerTopRight}>
          {profile?.role === "admin" && (
            <>
              <Pressable style={s.bannerIconBtn} onPress={() => router.push("/admin/packs" as any)}>
                <Ionicons name="construct-outline" size={20} color="white" />
              </Pressable>
              <Pressable style={s.bannerIconBtn} onPress={() => router.push("/admin/banners" as any)}>
                <Ionicons name="image-outline" size={20} color="white" />
              </Pressable>
            </>
          )}
          <Pressable style={s.bannerIconBtn} onPress={() => { setEditPseudo(pseudo); setEditBannerUrl(profile?.banner_url ?? null); setEditOpen(true); }}>
            <Ionicons name="settings-outline" size={20} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Avatar row */}
      <View style={s.avatarRow}>
        <View style={[s.avatarCircle, { backgroundColor: color }]}>
          <Text style={s.avatarInitial}>{pseudo.charAt(0).toUpperCase()}</Text>
        </View>
        <Pressable style={s.modifierBtn} onPress={() => { setEditPseudo(pseudo); setEditBannerUrl(profile?.banner_url ?? null); setEditOpen(true); }}>
          <Ionicons name="create-outline" size={16} color={color} />
          <Text style={[s.modifierText, { color }]}>Modifier</Text>
        </Pressable>
      </View>

      {/* Name + badges row */}
      <View style={s.nameRow}>
        <Text style={s.pseudo}>{pseudo}</Text>
        {badges.length > 0 && (
          <View style={[s.badgePill, { backgroundColor: color + "22", borderColor: color + "44" }]}>
            <Ionicons name="shield-checkmark" size={14} color={color} />
            <Text style={[s.badgePillText, { color }]}>+{badges.length}</Text>
          </View>
        )}
      </View>

      {/* Level + coins pills */}
      <View style={s.pillsRow}>
        <View style={[s.pill, { backgroundColor: color + "18" }]}>
          <Ionicons name="star" size={13} color={color} />
          <Text style={[s.pillText, { color }]}>Niveau {level}</Text>
        </View>
        <View style={[s.pill, { backgroundColor: "#fef9c3" }]}>
          <CatCoin size={28} style={{ marginVertical: -4 }} />
          <Text style={[s.pillText, { color: "#92400e" }]}>{coins} coins</Text>
        </View>
      </View>

      {/* XP progress */}
      <View style={s.xpSection}>
        <View style={s.xpHeader}>
          <Text style={s.xpLabel}>Progression vers le niveau {level + 1}</Text>
          <Text style={s.xpValue}>{xpIntoLevel}/100 XP</Text>
        </View>
        <View style={s.xpBg}>
          <View style={[s.xpFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
        </View>
      </View>

      {/* Stats card */}
      <View style={s.statsCard}>
        <View style={s.statItem}>
          <Text style={s.statValue}>{stats.activeDays}</Text>
          <Text style={s.statLabel}>Jours{"\n"}d'activité</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statValue}>{stats.habitsCount}</Text>
          <Text style={s.statLabel}>Habitudes{"\n"}actives</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statValue}>{stats.totalCompletions}</Text>
          <Text style={s.statLabel}>Complétions{"\n"}totales</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statValue}>{stats.challengesDone}</Text>
          <Text style={s.statLabel}>Challenges{"\n"}rejoints</Text>
        </View>
      </View>

      {/* Badges */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Badges</Text>
          <Pressable onPress={() => router.push("/badges" as any)}>
            <Text style={s.seeAll}>Voir tout</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.badgesRow}>
          {/* Earned badges */}
          {badges.filter(b => BADGE_CATALOG.some(c => c.key === b.badge_key)).map((badge) => {
            const def = BADGE_CATALOG.find(c => c.key === badge.badge_key)!;
            return (
              <View key={badge.id} style={s.badgeCard}>
                <Image source={def.colorImage} style={s.badgeImg} resizeMode="contain" />
                <Text style={s.badgeLabel} numberOfLines={1}>{def.label}</Text>
              </View>
            );
          })}
          {/* 3 locked preview badges (not yet earned) */}
          {BADGE_CATALOG.filter(def => !badges.some(b => b.badge_key === def.key)).slice(0, 3).map((def) => (
            <View key={def.key} style={[s.badgeCard, s.badgeCardLocked]}>
              <Image source={def.greyImage} style={[s.badgeImg, s.badgeImgLocked]} resizeMode="contain" />
              <Ionicons name="lock-closed" size={12} color="#cbd5e1" style={{ position: "absolute", top: 8, right: 8 }} />
              <Text style={[s.badgeLabel, s.badgeLabelLocked]} numberOfLines={1}>{def.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Heatmap */}
      <View style={s.section}>
        <Heatmap />
      </View>

      {/* Sign out */}
      <Pressable style={s.signOutBtn} onPress={() => supabase.auth.signOut()}>
        <Ionicons name="log-out-outline" size={16} color="#ef4444" />
        <Text style={s.signOutText}>Se déconnecter</Text>
      </Pressable>

      {/* Edit modal */}
      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <View style={s.modalBg}>
          <ScrollView style={s.modalScroll} contentContainerStyle={s.modalBox} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Modifier le profil</Text>

            <Text style={s.modalLabel}>Pseudo</Text>
            <TextInput
              style={s.input}
              placeholder="Pseudo"
              value={editPseudo}
              onChangeText={setEditPseudo}
              autoCapitalize="none"
            />

            <Text style={s.modalLabel}>Banner</Text>

            {/* Preview */}
            <View style={s.bannerPreview}>
              {editBannerUrl
                ? <Image source={{ uri: editBannerUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                : <View style={[StyleSheet.absoluteFill, { backgroundColor: bannerA }]}>
                    <View style={[s.deco1, { backgroundColor: bannerB + "66" }]} />
                    <View style={[s.deco2, { backgroundColor: bannerB + "44" }]} />
                  </View>
              }
              {editBannerUrl && (
                <Pressable style={s.clearBanner} onPress={() => setEditBannerUrl(null)}>
                  <Ionicons name="close-circle" size={22} color="white" />
                </Pressable>
              )}
            </View>

            {/* Upload perso */}
            <Pressable style={[s.uploadRow, uploadingBanner && { opacity: 0.6 }]} onPress={pickBanner} disabled={uploadingBanner}>
              {uploadingBanner
                ? <ActivityIndicator size="small" color="#6366f1" />
                : <Ionicons name="image-outline" size={18} color="#6366f1" />}
              <Text style={s.uploadText}>{uploadingBanner ? "Upload en cours..." : "Choisir depuis ma galerie"}</Text>
            </Pressable>

            {/* Banners prédéfinis */}
            {predefinedBanners.length > 0 && (
              <>
                <Text style={s.modalLabel}>Banners disponibles</Text>
                <View style={s.bannersGrid}>
                  {predefinedBanners.map((b) => (
                    <Pressable key={b.id} onPress={() => setEditBannerUrl(b.url)}
                      style={[s.bannerThumb, editBannerUrl === b.url && s.bannerThumbSelected]}>
                      <Image source={{ uri: b.url }} style={s.bannerThumbImg} resizeMode="cover" />
                      <Text style={s.bannerThumbName} numberOfLines={1}>{b.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <View style={s.modalActions}>
              <Pressable style={[s.modalBtn, s.ghost]} onPress={() => setEditOpen(false)}>
                <Text style={s.ghostText}>Annuler</Text>
              </Pressable>
              <Pressable style={[s.modalBtn, { backgroundColor: color }]} onPress={saveProfile} disabled={saving}>
                <Text style={s.primaryText}>{saving ? "..." : "Enregistrer"}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#ffffff" },
  container: { paddingBottom: 48 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Banner
  banner: { height: 160, overflow: "hidden", position: "relative" },
  deco1: { position: "absolute", width: 160, height: 160, borderRadius: 80, top: -40, right: -40 },
  deco2: { position: "absolute", width: 100, height: 100, borderRadius: 50, bottom: -20, left: 40 },
  deco3: { position: "absolute", width: 70, height: 70, borderRadius: 35, top: 20, left: -20 },
  bannerTopRight: { position: "absolute", top: 52, right: 16, flexDirection: "row", gap: 8 },
  bannerIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },

  // Avatar row
  avatarRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, marginTop: -38 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "white" },
  avatarInitial: { color: "white", fontSize: 32, fontWeight: "800" },
  modifierBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "white", marginBottom: 6 },
  modifierText: { fontSize: 14, fontWeight: "700" },

  // Name
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, marginTop: 10 },
  pseudo: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  badgePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  badgePillText: { fontSize: 12, fontWeight: "700" },

  // Pills
  pillsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  pillText: { fontSize: 13, fontWeight: "700" },

  // Stats card
  statsCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#1e293b",
    borderRadius: 18,
    flexDirection: "row",
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: "center", gap: 6 },
  statValue: { fontSize: 22, fontWeight: "800", color: "white" },
  statLabel: { fontSize: 11, color: "#94a3b8", textAlign: "center", lineHeight: 15, fontWeight: "500" },
  statDivider: { width: 1, backgroundColor: "#334155", marginVertical: 4 },

  // XP
  xpSection: { paddingHorizontal: 20, marginTop: 16, gap: 8 },
  xpHeader: { flexDirection: "row", justifyContent: "space-between" },
  xpLabel: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  xpValue: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  xpBg: { height: 8, borderRadius: 4, backgroundColor: "#f1f5f9", overflow: "hidden" },
  xpFill: { height: 8, borderRadius: 4 },

  // Sections
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  seeAll: { fontSize: 13, fontWeight: "700", color: "#3b82f6" },
  badgesRow: { flexDirection: "row", gap: 10, paddingRight: 4 },
  badgesEmpty: { fontSize: 13, color: "#94a3b8", fontStyle: "italic" },
  badgeCard: { alignItems: "center", gap: 6, backgroundColor: "#f9fafb", borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: "#e2e8f0", width: 110, position: "relative" },
  badgeCardLocked: { backgroundColor: "#f8fafc", borderColor: "#f1f5f9" },
  badgeImg: { width: 68, height: 68 },
  badgeImgLocked: { opacity: 0.25 },
  badgeLabel: { fontSize: 11, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  badgeLabelLocked: { color: "#cbd5e1" },
  badgeIconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  badgeLabel: { fontSize: 11, fontWeight: "700", textAlign: "center" },

  // Sign out
  signOutBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 24, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  signOutText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },

  // Modal
  modalBg: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalScroll: { maxHeight: "90%", backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalBox: { padding: 24, gap: 10, paddingBottom: 36 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  modalLabel: { fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, fontSize: 15 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: "center" },
  ghost: { backgroundColor: "#f3f4f6" },
  ghostText: { color: "#555", fontWeight: "600" },
  primaryText: { color: "white", fontWeight: "700" },

  // Banner picker
  bannerPreview: { height: 80, borderRadius: 14, overflow: "hidden", backgroundColor: "#e5e7eb", position: "relative" },
  clearBanner: { position: "absolute", top: 6, right: 6 },
  uploadRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: "#c7d2fe", borderRadius: 10, padding: 12, borderStyle: "dashed" },
  uploadText: { color: "#6366f1", fontWeight: "600", fontSize: 14 },
  bannersGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bannerThumb: { width: "47%", borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  bannerThumbSelected: { borderColor: "#6366f1" },
  bannerThumbImg: { width: "100%", height: 50 },
  bannerThumbName: { fontSize: 11, color: "#374151", fontWeight: "600", padding: 4, textAlign: "center" },
});
