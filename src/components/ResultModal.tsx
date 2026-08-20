import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  success: boolean;
  message: string;
  onClose: () => void;
};

export default function ResultModal({ visible, success, message, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.box} onPress={() => {}}>
          <View style={[s.iconCircle, success ? s.iconSuccess : s.iconError]}>
            <Ionicons
              name={success ? "checkmark" : "close"}
              size={32}
              color="white"
            />
          </View>
          <Text style={s.title}>{success ? "Succès" : "Erreur"}</Text>
          <Text style={s.message}>{message}</Text>
          <Pressable style={[s.btn, success ? s.btnSuccess : s.btnError]} onPress={onClose}>
            <Text style={s.btnText}>OK</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 28,
    width: 280,
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSuccess: { backgroundColor: "#10b981" },
  iconError:   { backgroundColor: "#ef4444" },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  message: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 },
  btn: {
    marginTop: 4,
    width: "100%",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  btnSuccess: { backgroundColor: "#10b981" },
  btnError:   { backgroundColor: "#ef4444" },
  btnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
