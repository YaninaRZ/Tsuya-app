import { useTheme, type Theme } from "@/lib/theme";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  badgeKey: string | null;
  level: number;
  onClose: () => void;
};

const BADGE_IMAGES: Record<string, any> = {
  "blue-paw":     require("../../assets/images/badges/blue-paw-badge.png"),
  "cats-blue":    require("../../assets/images/badges/cats-blue-badge.png"),
  "coins-fish":   require("../../assets/images/badges/coins-fish-badge.png"),
  "green-jungle": require("../../assets/images/badges/green-jungle-badge.png"),
  "money-jungle": require("../../assets/images/badges/money-jungle-badge.png"),
  "sleep-cat":    require("../../assets/images/badges/sleep-cat-badge.png"),
  "sun-cat":      require("../../assets/images/badges/sun-cat-badge.png"),
  "two-cat":      require("../../assets/images/badges/two-cat-badge.png"),
  "two-paws":     require("../../assets/images/badges/two-paws-check-badge.png"),
};

const BADGE_LABELS: Record<string, string> = {
  "blue-paw":     "Premier pas",
  "cats-blue":    "Challenge créé",
  "coins-fish":   "Riche en coins",
  "green-jungle": "Jungle verte",
  "money-jungle": "Grand dépensier",
  "sleep-cat":    "Flemme royale",
  "sun-cat":      "Soleil levant",
  "two-cat":      "Populaire",
  "two-paws":     "Nouveau look",
};

function badgeDesc(level: number) {
  if (level === 2) return "Première montée de niveau !";
  return `Niveau ${level} atteint !`;
}

export default function BadgeModal({ badgeKey, level, onClose }: Props) {
  const t = useTheme();
  const s = makeStyles(t);

  if (!badgeKey) return null;

  const badgeImage = BADGE_IMAGES[badgeKey];
  const badgeLabel = BADGE_LABELS[badgeKey] ?? badgeKey;

  return (
    <Modal visible animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={s.screen}>

        <View style={s.top}>
          <Text style={s.sup}>Badge débloqué !</Text>
          <Text style={s.sub}>{badgeLabel} 🎉</Text>
        </View>

        {badgeImage ? (
          <Image source={badgeImage} style={s.badgeImg} resizeMode="contain" />
        ) : (
          <Image source={require("../../assets/images/happy-tsuya.png")} style={s.badgeImg} resizeMode="contain" />
        )}

        <View style={s.tipBox}>
          <View style={s.tipTag}>
            <Text style={s.tipTagText}>Badge</Text>
          </View>
          <Text style={s.tipText}>
            {badgeDesc(level)}{"\n"}Continue tes habitudes pour en gagner encore !
          </Text>
        </View>

        <Pressable style={s.btn} onPress={onClose}>
          <Text style={s.btnText}>Super !</Text>
        </Pressable>

      </View>
    </Modal>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
      paddingHorizontal: 28,
      paddingTop: 72,
      paddingBottom: 48,
      alignItems: "center",
      justifyContent: "center",
      gap: 28,
    },
    top: { alignItems: "center", gap: 6 },
    sup: { fontSize: 13, color: t.textMuted, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
    sub: { fontSize: 22, fontWeight: "800", color: t.text, textAlign: "center" },
    badgeImg: { width: 180, height: 180 },
    tipBox: { width: "100%", backgroundColor: t.blueLight, borderRadius: 18, padding: 20, gap: 10 },
    tipTag: { backgroundColor: t.surfaceAlt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start" },
    tipTagText: { color: t.purple, fontWeight: "700", fontSize: 13 },
    tipText: { fontSize: 14, color: t.textSecondary, lineHeight: 22 },
    btn: { width: "100%", backgroundColor: t.actionBtn, borderRadius: 28, paddingVertical: 20, alignItems: "center" },
    btnText: { color: t.actionBtnText, fontSize: 17, fontWeight: "800" },
  });
}
