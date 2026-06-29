import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/context/HabitsContext";
import { supabase } from "@/lib/supabase";
import { useTheme, type Theme } from "@/lib/theme";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

type RewardPack = { id: string; name: string; difficulty: string; description: string | null };

const DIFF_COLORS: Record<string, string> = { easy: "#10b981", medium: "#f97316", hard: "#ef4444" };
const DIFF_LABELS: Record<string, string> = { easy: "Débutant", medium: "Intermédiaire", hard: "Expert" };

export default function AddHabitModal() {
  const t = useTheme();
  const s = makeStyles(t);
  const { session } = useAuth();
  const { modalOpen, closeModal, triggerRefresh, editingHabit } = useHabits();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [xp, setXp] = useState("10");
  const [frequency, setFrequency] = useState("daily");
  const [duration, setDuration] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [packs, setPacks] = useState<RewardPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditing = editingHabit !== null;

  useEffect(() => {
    supabase.from("reward_packs").select("id, name, difficulty, description").eq("is_active", true).order("difficulty")
      .then(({ data }) => setPacks(data ?? []));
  }, []);

  useEffect(() => {
    if (editingHabit) {
      setTitle(editingHabit.title);
      setDescription(editingHabit.description ?? "");
      setXp(String(editingHabit.xp_reward));
      setFrequency(editingHabit.frequency);
      setDuration(editingHabit.duration_days ? String(editingHabit.duration_days) : "");
      setIsPublic(editingHabit.is_public);
      setSelectedPackId((editingHabit as any).reward_pack_id ?? null);
    } else {
      setTitle("");
      setDescription("");
      setXp("10");
      setFrequency("daily");
      setDuration("");
      setIsPublic(false);
      setSelectedPackId(null);
    }
  }, [editingHabit, modalOpen]);

  async function save() {
    if (editingHabit?.source_habit_id) {
      Alert.alert("Non autorisé", "Tu ne peux pas modifier un challenge rejoint.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Oups", "Donne un titre à ton habitude.");
      return;
    }
    setSaving(true);

    const payload: Record<string, any> = {
      title: title.trim(),
      description: description.trim() || null,
      xp_reward: parseInt(xp) || 10,
      frequency,
      duration_days: duration ? parseInt(duration) : null,
      is_public: isPublic,
      reward_pack_id: isPublic ? selectedPackId : null,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from("habits").update(payload).eq("id", editingHabit!.id));
    } else {
      ({ error } = await supabase.from("habits").insert({ ...payload, user_id: session?.user.id }));
    }

    setSaving(false);
    if (error) { Alert.alert("Erreur", error.message); return; }
    closeModal();
    triggerRefresh();
  }

  return (
    <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
      <View style={s.bg}>
        <View style={s.sheet}>
          <ScrollView style={{ maxHeight: "90%" }} contentContainerStyle={s.box} keyboardShouldPersistTaps="handled">
            <Text style={s.title}>{isEditing ? "Modifier l'habitude" : "Nouvelle habitude"}</Text>

            <TextInput style={s.input} placeholder="Titre (ex: Boire 2L d'eau)" placeholderTextColor={t.placeholder} value={title} onChangeText={setTitle} />
            <TextInput style={s.input} placeholder="Description (optionnel)" placeholderTextColor={t.placeholder} value={description} onChangeText={setDescription} />

            <Text style={s.label}>Fréquence</Text>
            <View style={s.freqRow}>
              <Pressable style={[s.freqBtn, frequency === "daily" && s.freqActive]} onPress={() => setFrequency("daily")}>
                <Text style={[s.freqText, frequency === "daily" && s.freqTextActive]}>Quotidien</Text>
              </Pressable>
              <Pressable style={[s.freqBtn, frequency === "weekly" && s.freqActive]} onPress={() => setFrequency("weekly")}>
                <Text style={[s.freqText, frequency === "weekly" && s.freqTextActive]}>Hebdo</Text>
              </Pressable>
            </View>

            <TextInput style={s.input} placeholder="Durée en jours (optionnel, ex: 30)" placeholderTextColor={t.placeholder} keyboardType="number-pad" value={duration} onChangeText={setDuration} />
            <TextInput style={s.input} placeholder="XP gagnés" placeholderTextColor={t.placeholder} keyboardType="number-pad" value={xp} onChangeText={setXp} />

            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleLabel}>{isPublic ? "🌍 Challenge public" : "🔒 Privée"}</Text>
                <Text style={s.toggleSub}>
                  {isPublic ? "Visible dans les Challenges — d'autres peuvent la rejoindre" : "Visible uniquement par toi"}
                </Text>
              </View>
              <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ false: t.border, true: "#93c5fd" }} thumbColor={isPublic ? "#3b82f6" : "#f4f4f5"} />
            </View>

            {isPublic && packs.length > 0 && (
              <View style={s.packSection}>
                <Text style={s.label}>Pack de récompenses</Text>
                <Text style={s.packSub}>Les participants gagnent un loot aléatoire en complétant ce challenge</Text>
                <View style={s.packRow}>
                  {packs.map((pack) => {
                    const color = DIFF_COLORS[pack.difficulty] ?? "#888";
                    const selected = selectedPackId === pack.id;
                    return (
                      <Pressable key={pack.id} style={[s.packBtn, selected && { borderColor: color, backgroundColor: color + "15" }]} onPress={() => setSelectedPackId(pack.id)}>
                        <Text style={[s.packDiff, { color }]}>{DIFF_LABELS[pack.difficulty] ?? pack.difficulty}</Text>
                        <Text style={s.packName}>{pack.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={s.actions}>
              <Pressable style={[s.btn, s.ghost]} onPress={closeModal}>
                <Text style={s.ghostText}>Annuler</Text>
              </Pressable>
              <Pressable style={[s.btn, s.primary]} onPress={save} disabled={saving}>
                <Text style={s.primaryText}>{saving ? "..." : isEditing ? "Enregistrer" : "Ajouter"}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    bg: { flex: 1, justifyContent: "flex-end", backgroundColor: t.overlay },
    sheet: { backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
    box: { padding: 24, gap: 12, paddingBottom: 36 },
    title: { fontSize: 20, fontWeight: "700", marginBottom: 4, color: t.text },
    label: { fontSize: 13, color: t.textSecondary, fontWeight: "600" },
    input: { borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 14, backgroundColor: t.input, color: t.text },
    freqRow: { flexDirection: "row", gap: 10 },
    freqBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: "center" },
    freqActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
    freqText: { color: t.textSecondary, fontWeight: "600" },
    freqTextActive: { color: "white" },
    toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: t.surfaceAlt, borderRadius: 12, padding: 14, gap: 12 },
    toggleLabel: { fontSize: 15, fontWeight: "700", color: t.text },
    toggleSub: { fontSize: 12, color: t.textSecondary, marginTop: 2, maxWidth: 220 },
    packSection: { gap: 8 },
    packSub: { fontSize: 12, color: "#9ca3af" },
    packRow: { flexDirection: "row", gap: 8 },
    packBtn: { flex: 1, borderWidth: 1.5, borderColor: t.border, borderRadius: 10, padding: 10, alignItems: "center", gap: 4 },
    packDiff: { fontSize: 11, fontWeight: "700" },
    packName: { fontSize: 12, fontWeight: "600", color: t.text, textAlign: "center" },
    actions: { flexDirection: "row", gap: 12, marginTop: 8 },
    btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: "center" },
    ghost: { backgroundColor: t.ghostBg },
    ghostText: { color: t.ghostText, fontWeight: "600" },
    primary: { backgroundColor: "#3b82f6" },
    primaryText: { color: "white", fontWeight: "700" },
  });
}
