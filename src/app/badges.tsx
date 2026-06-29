import { useThemeMode } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useTheme, type Theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type BadgeDef = { key: string; label: string; description: string; greyImage: any; colorImage: any };

const BADGE_CATALOG: BadgeDef[] = [
  { key: "blue-paw",     label: "Premier pas",     description: "Première habitude cochée",             greyImage: require("../../assets/images/badges/grey-blue-paw-badge.png"),        colorImage: require("../../assets/images/badges/blue-paw-badge.png") },
  { key: "cats-blue",    label: "Challenge créé",  description: "Création d'une habitude publique",     greyImage: require("../../assets/images/badges/grey-cats-blue-badge.png"),       colorImage: require("../../assets/images/badges/cats-blue-badge.png") },
  { key: "coins-fish",   label: "Riche en coins",  description: "100 premiers coins gagnés",            greyImage: require("../../assets/images/badges/grey-coins-fish-badge.png"),      colorImage: require("../../assets/images/badges/coins-fish-badge.png") },
  { key: "green-jungle", label: "Jungle verte",    description: "7 habitudes validées",                 greyImage: require("../../assets/images/badges/grey-green-jungle-badge.png"),    colorImage: require("../../assets/images/badges/green-jungle-badge.png") },
  { key: "money-jungle", label: "Grand dépensier", description: "1000 pièces dépensées",                greyImage: require("../../assets/images/badges/grey-money-jungle-badge.png"),    colorImage: require("../../assets/images/badges/money-jungle-badge.png") },
  { key: "sleep-cat",    label: "Flemme royale",   description: "3 jours d'inactivité",                 greyImage: require("../../assets/images/badges/grey-sleep-cat-badge.png"),       colorImage: require("../../assets/images/badges/sleep-cat-badge.png") },
  { key: "sun-cat",      label: "Soleil levant",   description: "5 jours d'activité consécutifs",       greyImage: require("../../assets/images/badges/grey-sun-cat-badge.png"),         colorImage: require("../../assets/images/badges/sun-cat-badge.png") },
  { key: "two-cat",      label: "Populaire",       description: "10 membres ont rejoint mon challenge",  greyImage: require("../../assets/images/badges/grey-two-cat-badge.png"),         colorImage: require("../../assets/images/badges/two-cat-badge.png") },
  { key: "two-paws",     label: "Nouveau look",    description: "Modification du banner profil",        greyImage: require("../../assets/images/badges/grey-two-paws-check-badge.png"),  colorImage: require("../../assets/images/badges/two-paws-check-badge.png") },
];

export default function BadgesPage() {
  const t = useTheme();
  const s = makeStyles(t);
  const { isDark } = useThemeMode();
  const { session } = useAuth();
  const [earnedKeys, setEarnedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<BadgeDef | null>(null);

  const fetchBadges = useCallback(async () => {
    const { data } = await supabase.from("user_badges").select("badge_key").eq("user_id", session?.user.id);
    setEarnedKeys(new Set((data ?? []).map((b) => b.badge_key)));
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { fetchBadges(); }, [fetchBadges]));

  const earnedCount = BADGE_CATALOG.filter(b => earnedKeys.has(b.key)).length;

  if (loading) return <View style={s.center}><ActivityIndicator color="#3b82f6" /></View>;

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>
        <View>
          <Text style={s.title}>Badges</Text>
          <Text style={s.sub}>{earnedCount}/{BADGE_CATALOG.length} débloqués</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
        {BADGE_CATALOG.map((def) => {
          const earned = earnedKeys.has(def.key);
          return (
            <Pressable
              key={def.key}
              style={[s.card, earned ? s.cardEarned : s.cardLocked]}
              onPress={() => setPreview(def)}
            >
              <Image
                source={earned ? def.colorImage : def.greyImage}
                style={[s.img, !earned && s.imgLocked]}
                resizeMode="contain"
              />
              {!earned && (
                <View style={s.lockWrap}>
                  <Ionicons name="lock-closed" size={13} color={t.textMuted} />
                </View>
              )}
              <Text style={[s.label, !earned && s.labelLocked]} numberOfLines={1}>{def.label}</Text>
              <Text style={[s.desc, !earned && s.descLocked]} numberOfLines={2}>{def.description}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={!!preview} animationType="fade" transparent={false} onRequestClose={() => setPreview(null)}>
        {preview && (() => {
          const isEarned = earnedKeys.has(preview.key);
          return (
            <View style={s.previewScreen}>
              <Pressable style={s.previewClose} onPress={() => setPreview(null)}>
                <Ionicons name="close" size={22} color={t.textSecondary} />
              </Pressable>

              <Image
                source={isEarned ? preview.colorImage : preview.greyImage}
                style={[s.previewImg, !isEarned && s.previewImgLocked]}
                resizeMode="contain"
              />

              <View style={s.lockBadge}>
                <Ionicons
                  name={isEarned ? "checkmark-circle" : "lock-closed"}
                  size={18}
                  color={isEarned ? "#10b981" : t.textMuted}
                />
                <Text style={[s.lockBadgeText, isEarned && { color: "#10b981" }]}>
                  {isEarned ? "Badge débloqué !" : "Badge verrouillé"}
                </Text>
              </View>

              <Text style={s.previewLabel}>{preview.label}</Text>
              <Text style={s.previewDesc}>{preview.description}</Text>

              <View style={[s.previewTipBox, isEarned && { backgroundColor: isDark ? "#0a2818" : "#f0fdf4" }]}>
                <View style={[s.previewTipTag, isEarned && { backgroundColor: isDark ? "#065f46" : "#bbf7d0" }]}>
                  <Text style={[s.previewTipTagText, isEarned && { color: isDark ? "#6ee7b7" : "#15803d" }]}>
                    {isEarned ? "Condition" : "Comment débloquer"}
                  </Text>
                </View>
                <Text style={s.previewTipText}>{preview.description}</Text>
              </View>

              <Pressable style={s.previewBtn} onPress={() => setPreview(null)}>
                <Text style={s.previewBtnText}>Fermer</Text>
              </Pressable>
            </View>
          );
        })()}
      </Modal>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background, paddingTop: 60 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: t.background },

    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.navBtn, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 22, fontWeight: "800", color: t.text },
    sub: { fontSize: 12, color: t.textMuted, fontWeight: "600", marginTop: 2 },

    grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12, paddingBottom: 40 },

    card: { width: "30%", alignItems: "center", gap: 6, borderRadius: 18, padding: 14, borderWidth: 1.5, position: "relative" },
    cardEarned: { backgroundColor: t.card, borderColor: t.border },
    cardLocked: { backgroundColor: t.surface, borderColor: t.borderLight },

    img: { width: 70, height: 70 },
    imgLocked: { opacity: 0.25 },
    lockWrap: { position: "absolute", top: 8, right: 8 },

    label: { fontSize: 11, fontWeight: "800", color: t.text, textAlign: "center" },
    labelLocked: { color: t.textMuted },
    desc: { fontSize: 10, color: t.textSecondary, textAlign: "center", lineHeight: 14 },
    descLocked: { color: t.border },

    previewScreen: {
      flex: 1,
      backgroundColor: t.background,
      paddingHorizontal: 28,
      paddingTop: 64,
      paddingBottom: 48,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    },
    previewClose: {
      position: "absolute",
      top: 56,
      right: 24,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.navBtn,
      alignItems: "center",
      justifyContent: "center",
    },
    previewImg: { width: 200, height: 200 },
    previewImgLocked: { opacity: 0.25 },
    lockBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
    lockBadgeText: { fontSize: 13, color: t.textMuted, fontWeight: "600" },
    previewLabel: { fontSize: 26, fontWeight: "900", color: t.text, textAlign: "center" },
    previewDesc: { fontSize: 15, color: t.textSecondary, textAlign: "center", lineHeight: 22 },
    previewTipBox: { width: "100%", backgroundColor: t.surface, borderRadius: 18, padding: 20, gap: 10 },
    previewTipTag: { backgroundColor: t.surfaceAlt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start" },
    previewTipTagText: { color: t.textSecondary, fontWeight: "700", fontSize: 13 },
    previewTipText: { fontSize: 14, color: t.textSecondary, lineHeight: 22 },
    previewBtn: { width: "100%", backgroundColor: t.actionBtn, borderRadius: 28, paddingVertical: 20, alignItems: "center" },
    previewBtnText: { color: t.actionBtnText, fontSize: 17, fontWeight: "800" },
  });
}
