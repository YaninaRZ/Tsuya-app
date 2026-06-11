import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

type LootType = "xp_boost" | "coins_bonus" | "free_reward";

type Props = {
  loot: { label: string; type: LootType; value: number | null } | null;
  hasRewards?: boolean;
  onGoToShop?: () => void;
  onClose: () => void;
};

const LOOT_CONFIG: Record<LootType, { color: string; bg: string; title: string; tip: string; image: any }> = {
  xp_boost:    { color: "#6366f1", bg: "#eef2ff", title: "Boost XP !",           tip: "Tu reçois un bonus d'XP pour ce challenge. Continue pour en gagner encore !",              image: require("../../assets/images/happy-tsuya.png") },
  coins_bonus: { color: "#ca8a04", bg: "#fef9c3", title: "Bonus Coins !",        tip: "Des coins supplémentaires ont été ajoutés à ton solde. Dépense-les dans la boutique !",   image: require("../../assets/images/money/cat-coin.png") },
  free_reward: { color: "#10b981", bg: "#d1fae5", title: "Récompense offerte !", tip: "Une récompense de ta boutique a été débloquée automatiquement. Profites-en !",             image: require("../../assets/images/money/cat-cupon-free-reward.png") },
};

export default function LootModal({ loot, hasRewards = true, onGoToShop, onClose }: Props) {
  if (!loot) return null;
  const cfg = LOOT_CONFIG[loot.type] ?? LOOT_CONFIG.xp_boost;
  const isFreeNoRewards = loot.type === "free_reward" && !hasRewards;

  return (
    <Modal visible animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={s.screen}>

        <View style={s.top}>
          <Text style={s.sup}>Pack de récompenses</Text>
          <Text style={s.sub}>{cfg.title}</Text>
        </View>

        <Image
          source={cfg.image}
          style={s.mascot}
          resizeMode="contain"
        />

        <Text style={s.label}>{loot.label}</Text>

        <View style={[s.tipBox, { backgroundColor: cfg.bg }]}>
          <View style={[s.tipTag, { backgroundColor: cfg.color + "33" }]}>
            <Text style={[s.tipTagText, { color: cfg.color }]}>Info</Text>
          </View>
          <Text style={s.tipText}>
            {isFreeNoRewards
              ? "Tu n'as pas encore de récompense dans ta boutique. Crée-en une pour utiliser cette récompense gratuite !"
              : cfg.tip}
          </Text>
        </View>

        {isFreeNoRewards && onGoToShop ? (
          <Pressable style={[s.btn, { backgroundColor: cfg.color }]} onPress={() => { onClose(); onGoToShop(); }}>
            <Text style={s.btnText}>Créer une récompense</Text>
          </Pressable>
        ) : null}

        <Pressable style={[s.btn, isFreeNoRewards ? s.btnGhost : { backgroundColor: "#0f172a" }]} onPress={onClose}>
          <Text style={[s.btnText, isFreeNoRewards && { color: "#64748b" }]}>
            {isFreeNoRewards ? "Plus tard" : "Super !"}
          </Text>
        </Pressable>

      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "white",
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  top: { alignItems: "center", gap: 6 },
  sup: { fontSize: 13, color: "#94a3b8", fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  sub: { fontSize: 22, fontWeight: "800", color: "#0f172a", textAlign: "center" },
  mascot: { width: 160, height: 160 },
  label: { fontSize: 24, fontWeight: "900", color: "#0f172a", textAlign: "center" },
  tipBox: { width: "100%", borderRadius: 18, padding: 20, gap: 10 },
  tipTag: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start" },
  tipTagText: { fontWeight: "700", fontSize: 13 },
  tipText: { fontSize: 14, color: "#334155", lineHeight: 22 },
  btn: { width: "100%", borderRadius: 28, paddingVertical: 20, alignItems: "center" },
  btnGhost: { backgroundColor: "#f1f5f9" },
  btnText: { color: "white", fontSize: 17, fontWeight: "800" },
});
