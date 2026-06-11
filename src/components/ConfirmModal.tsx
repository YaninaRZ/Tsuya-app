import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible, title, message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  onConfirm, onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.box}>
          <Text style={s.title}>{title}</Text>
          {message ? <Text style={s.message}>{message}</Text> : null}
          <View style={s.btns}>
            <Pressable style={[s.btn, s.cancel]} onPress={onCancel}>
              <Text style={s.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable style={[s.btn, destructive ? s.destructive : s.confirm]} onPress={onConfirm}>
              <Text style={destructive ? s.destructiveText : s.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  box: {
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
    width: "100%",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  btns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  cancel: { backgroundColor: "#f1f5f9" },
  cancelText: { color: "#475569", fontWeight: "600", fontSize: 15 },
  confirm: { backgroundColor: "#dbeafe" },
  confirmText: { color: "#1d4ed8", fontWeight: "700", fontSize: 15 },
  destructive: { backgroundColor: "#fee2e2" },
  destructiveText: { color: "#dc2626", fontWeight: "700", fontSize: 15 },
});
