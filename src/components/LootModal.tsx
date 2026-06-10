import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type LootType = "xp_boost" | "coins_bonus" | "free_reward";

type Props = {
  loot: { label: string; type: LootType; value: number | null } | null;
  onClose: () => void;
};

const LOOT_CONFIG: Record<LootType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; title: string }> = {
  xp_boost:    { icon: "flash",          color: "#6366f1", bg: "#eef2ff", title: "Boost XP !" },
  coins_bonus: { icon: "cash",           color: "#ca8a04", bg: "#fef9c3", title: "Bonus Coins !" },
  free_reward: { icon: "gift",           color: "#10b981", bg: "#d1fae5", title: "Récompense offerte !" },
};

export default function LootModal({ loot, onClose }: Props) {
  if (!loot) return null;
  const cfg = LOOT_CONFIG[loot.type] ?? LOOT_CONFIG.xp_boost;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.box}>
          <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={44} color={cfg.color} />
          </View>
          <Text style={s.title}>{cfg.title}</Text>
          <Text style={s.label}>{loot.label}</Text>
          <Text style={s.sub}>Récompense gagnée en complétant ce challenge</Text>
          <Pressable style={[s.btn, { backgroundColor: cfg.color }]} onPress={onClose}>
            <Text style={s.btnText}>Super !</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 32 },
  box: { backgroundColor: "white", borderRadius: 24, padding: 32, alignItems: "center", gap: 12, width: "100%" },
  iconWrap: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  label: { fontSize: 16, fontWeight: "600", color: "#374151", textAlign: "center" },
  sub: { fontSize: 12, color: "#9ca3af", textAlign: "center" },
  btn: { marginTop: 8, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14 },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
});
