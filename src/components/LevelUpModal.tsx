import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  level: number;
  coinsGained: number;
  onClose: () => void;
};

export default function LevelUpModal({ visible, level, coinsGained, onClose }: Props) {
  const xpForLevel = level * 100;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={s.screen}>

        {/* Mascot + sparkles */}
        <View style={s.mascotWrap}>
          <Text style={s.sparkTL}>✦</Text>
          <Text style={s.sparkTR}>✦</Text>
          <Text style={s.sparkBL}>✦</Text>
          <Text style={s.sparkBR}>✦</Text>
          <Text style={s.sparkTop}>✦</Text>
          <Image
            source={require("../../assets/images/happy-tsuya.png")}
            style={s.mascot}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={s.title}>Niveau {level} !</Text>
        <Text style={s.sub}>Tu viens de passer un nouveau cap.{"\n"}Continue comme ça !</Text>

        {/* Stats cards */}
        <View style={s.cards}>
          <View style={[s.card, s.cardXp]}>
            <Text style={[s.cardLabel, { color: "#ca8a04" }]}>XP TOTAL</Text>
            <View style={s.cardValue}>
              <Text style={s.cardIcon}>⚡</Text>
              <Text style={[s.cardNum, { color: "#ca8a04" }]}>{xpForLevel}</Text>
            </View>
          </View>

          <View style={[s.card, s.cardLevel]}>
            <Text style={[s.cardLabel, { color: "#15803d" }]}>NIVEAU</Text>
            <View style={s.cardValue}>
              <Text style={s.cardIcon}>🏆</Text>
              <Text style={[s.cardNum, { color: "#15803d" }]}>{level}</Text>
            </View>
          </View>

          <View style={[s.card, s.cardCoins]}>
            <Text style={[s.cardLabel, { color: "#1d4ed8" }]}>COINS</Text>
            <View style={s.cardValue}>
              <Text style={s.cardIcon}>🪙</Text>
              <Text style={[s.cardNum, { color: "#1d4ed8" }]}>+{coinsGained}</Text>
            </View>
          </View>
        </View>

        {/* Button */}
        <Pressable style={s.btn} onPress={onClose}>
          <Text style={s.btnText}>RÉCUPÉRER</Text>
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
    paddingBottom: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },

  mascotWrap: { position: "relative", alignItems: "center", justifyContent: "center", width: 220, height: 220 },
  mascot: { width: 180, height: 180 },
  sparkTL: { position: "absolute", top: 10, left: 10, fontSize: 22, color: "#86efac" },
  sparkTR: { position: "absolute", top: 0,  right: 20, fontSize: 30, color: "#86efac" },
  sparkBL: { position: "absolute", bottom: 20, left: 20, fontSize: 18, color: "#86efac" },
  sparkBR: { position: "absolute", bottom: 10, right: 10, fontSize: 24, color: "#86efac" },
  sparkTop: { position: "absolute", top: 30, right: 60, fontSize: 14, color: "#86efac" },

  title: { fontSize: 34, fontWeight: "900", color: "#fbbf24", textAlign: "center" },
  sub: { fontSize: 16, color: "#64748b", textAlign: "center", lineHeight: 24, fontWeight: "500" },

  cards: { flexDirection: "row", gap: 10, width: "100%" },
  card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 3,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
  },
  cardXp:    { backgroundColor: "#fef9c3", borderColor: "#fbbf24" },
  cardLevel: { backgroundColor: "#dcfce7", borderColor: "#4ade80" },
  cardCoins: { backgroundColor: "#dbeafe", borderColor: "#60a5fa" },

  cardLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  cardValue: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardIcon: { fontSize: 20 },
  cardNum: { fontSize: 22, fontWeight: "900" },

  btn: {
    width: "100%",
    backgroundColor: "#0f172a",
    borderRadius: 28,
    paddingVertical: 20,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "white", fontSize: 17, fontWeight: "800" },
});
