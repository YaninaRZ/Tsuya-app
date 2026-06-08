import { StyleSheet, Text, View } from "react-native";

export default function Shop() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Shop 🛍️</Text>
      <Text style={s.muted}>Bientôt : dépense tes coins en récompenses</Text>
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
