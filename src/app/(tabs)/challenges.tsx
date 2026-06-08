import { StyleSheet, Text, View } from "react-native";

export default function Challenges() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Challenges</Text>
      <Text style={s.muted}>Bientôt : crée et rejoins des défis 💪</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 10,
  },
  title: { fontSize: 24, fontWeight: "700" },
  muted: { color: "#888" },
});
