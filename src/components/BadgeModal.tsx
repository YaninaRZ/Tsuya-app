import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  badgeKey: string | null;
  level: number;
  onClose: () => void;
};

function badgeLabel(level: number) {
  if (level === 2) return "Première montée !";
  return `Niveau ${level} atteint !`;
}

export default function BadgeModal({ badgeKey, level, onClose }: Props) {
  if (!badgeKey) return null;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.bg}>
        <View style={s.box}>
          <View style={s.iconWrap}>
            <Ionicons name="shield-checkmark" size={56} color="#6366f1" />
          </View>

          <Text style={s.congrats}>Badge débloqué ! 🎉</Text>
          <Text style={s.levelText}>{badgeLabel(level)}</Text>
          <Text style={s.hint}>Une image sera ajoutée prochainement.</Text>

          <Pressable style={s.btn} onPress={onClose}>
            <Text style={s.btnText}>Super !</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  box: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 10,
    width: "100%",
    maxWidth: 320,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  congrats: { fontSize: 20, fontWeight: "800", color: "#111827", textAlign: "center" },
  levelText: { fontSize: 16, fontWeight: "600", color: "#6366f1", textAlign: "center" },
  hint: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 2 },
  btn: {
    marginTop: 12,
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
});
