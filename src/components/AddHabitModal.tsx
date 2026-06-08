import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/context/HabitsContext";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function AddHabitModal() {
  const { session } = useAuth();
  const { modalOpen, closeModal, triggerRefresh } = useHabits();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [xp, setXp] = useState("10");
  const [frequency, setFrequency] = useState("daily");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);

  async function addHabit() {
    if (!title.trim()) {
      Alert.alert("Oups", "Donne un titre à ton habitude.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("habits").insert({
      user_id: session?.user.id,
      title: title.trim(),
      description: description.trim() || null,
      xp_reward: parseInt(xp) || 10,
      frequency,
      duration_days: duration ? parseInt(duration) : null,
    });
    setSaving(false);
    if (error) {
      Alert.alert("Erreur", error.message);
      return;
    }
    setTitle("");
    setDescription("");
    setXp("10");
    setFrequency("daily");
    setDuration("");
    closeModal();
    triggerRefresh();
  }

  return (
    <Modal
      visible={modalOpen}
      animationType="slide"
      transparent
      onRequestClose={closeModal}
    >
      <View style={s.bg}>
        <View style={s.box}>
          <Text style={s.title}>Nouvelle habitude</Text>
          <TextInput
            style={s.input}
            placeholder="Titre (ex: Boire 2L d'eau)"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={s.input}
            placeholder="Description (optionnel)"
            value={description}
            onChangeText={setDescription}
          />

          <Text style={s.label}>Fréquence</Text>
          <View style={s.freqRow}>
            <Pressable
              style={[s.freqBtn, frequency === "daily" && s.freqActive]}
              onPress={() => setFrequency("daily")}
            >
              <Text
                style={[s.freqText, frequency === "daily" && s.freqTextActive]}
              >
                Quotidien
              </Text>
            </Pressable>
            <Pressable
              style={[s.freqBtn, frequency === "weekly" && s.freqActive]}
              onPress={() => setFrequency("weekly")}
            >
              <Text
                style={[s.freqText, frequency === "weekly" && s.freqTextActive]}
              >
                Hebdo
              </Text>
            </Pressable>
          </View>

          <TextInput
            style={s.input}
            placeholder="Durée en jours (optionnel, ex: 30)"
            keyboardType="number-pad"
            value={duration}
            onChangeText={setDuration}
          />
          <TextInput
            style={s.input}
            placeholder="XP gagnés"
            keyboardType="number-pad"
            value={xp}
            onChangeText={setXp}
          />

          <View style={s.actions}>
            <Pressable style={[s.btn, s.ghost]} onPress={closeModal}>
              <Text style={s.ghostText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={[s.btn, s.primary]}
              onPress={addHabit}
              disabled={saving}
            >
              <Text style={s.primaryText}>{saving ? "..." : "Ajouter"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  bg: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  box: {
    backgroundColor: "white",
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  label: { fontSize: 13, color: "#888", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 14 },
  freqRow: { flexDirection: "row", gap: 10 },
  freqBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  freqActive: { backgroundColor: "#6366f1", borderColor: "#6366f1" },
  freqText: { color: "#555", fontWeight: "600" },
  freqTextActive: { color: "white" },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: "center" },
  ghost: { backgroundColor: "#f1f1f1" },
  ghostText: { color: "#555", fontWeight: "600" },
  primary: { backgroundColor: "#6366f1" },
  primaryText: { color: "white", fontWeight: "700" },
});
