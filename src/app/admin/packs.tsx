import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type PackItem = { id?: string; label: string; type: string; value: string; weight: string };
type Pack = { id: string; name: string; description: string | null; difficulty: string; is_active: boolean; items?: PackItem[] };

const DIFFICULTIES = [
  { key: "easy", label: "Débutant", color: "#10b981" },
  { key: "medium", label: "Intermédiaire", color: "#f97316" },
  { key: "hard", label: "Expert", color: "#ef4444" },
];

const TYPES = [
  { key: "xp_boost", label: "Boost XP", icon: "flash" },
  { key: "coins_bonus", label: "Bonus coins", icon: "cash" },
  { key: "free_reward", label: "Récompense gratuite", icon: "gift" },
];

function diffColor(d: string) { return DIFFICULTIES.find((x) => x.key === d)?.color ?? "#888"; }
function diffLabel(d: string) { return DIFFICULTIES.find((x) => x.key === d)?.label ?? d; }

export default function AdminPacks() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pack | null>(null);

  // Form
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [diff, setDiff] = useState("easy");
  const [items, setItems] = useState<PackItem[]>([{ label: "", type: "xp_boost", value: "", weight: "1" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPacks(); }, []);

  async function fetchPacks() {
    const { data } = await supabase.from("reward_packs").select("*, items:reward_pack_items(*)").order("created_at");
    setPacks((data ?? []).map((p: any) => ({ ...p, items: p.items ?? [] })));
  }

  function openCreate() {
    setEditing(null);
    setName(""); setDesc(""); setDiff("easy");
    setItems([{ label: "", type: "xp_boost", value: "20", weight: "3" }]);
    setModalOpen(true);
  }

  function openEdit(pack: Pack) {
    setEditing(pack);
    setName(pack.name);
    setDesc(pack.description ?? "");
    setDiff(pack.difficulty);
    setItems((pack.items ?? []).map((i) => ({ ...i, value: String(i.value ?? ""), weight: String(i.weight) })));
    setModalOpen(true);
  }

  function addItem() {
    setItems((prev) => [...prev, { label: "", type: "xp_boost", value: "", weight: "1" }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof PackItem, val: string) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }

  async function save() {
    if (!name.trim()) { Alert.alert("Oups", "Nom requis."); return; }
    if (items.some((i) => !i.label.trim())) { Alert.alert("Oups", "Chaque item doit avoir un label."); return; }
    setSaving(true);

    let packId = editing?.id;
    if (editing) {
      await supabase.from("reward_packs").update({ name: name.trim(), description: desc.trim() || null, difficulty: diff }).eq("id", editing.id);
      await supabase.from("reward_pack_items").delete().eq("pack_id", editing.id);
    } else {
      const { data } = await supabase.from("reward_packs").insert({ name: name.trim(), description: desc.trim() || null, difficulty: diff }).select("id").single();
      packId = data?.id;
    }

    if (packId) {
      await supabase.from("reward_pack_items").insert(
        items.map((i) => ({ pack_id: packId, label: i.label.trim(), type: i.type, value: i.value ? parseInt(i.value) : null, weight: parseInt(i.weight) || 1 }))
      );
    }

    setSaving(false);
    setModalOpen(false);
    fetchPacks();
  }

  async function toggleActive(pack: Pack) {
    await supabase.from("reward_packs").update({ is_active: !pack.is_active }).eq("id", pack.id);
    fetchPacks();
  }

  async function deletePack(pack: Pack) {
    Alert.alert("Supprimer ?", `Supprimer le pack « ${pack.name} » ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => { await supabase.from("reward_packs").delete().eq("id", pack.id); fetchPacks(); } },
    ]);
  }

  return (
    <View style={s.screen}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color="#6366f1" />
          <Text style={s.backText}>Profil</Text>
        </Pressable>
        <Text style={s.title}>Packs de récompenses</Text>
        <Pressable style={s.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={20} color="white" />
        </Pressable>
      </View>

      <FlatList
        data={packs}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={[s.card, !item.is_active && s.cardInactive]}>
            <View style={s.cardTop}>
              <View style={[s.diffBadge, { backgroundColor: diffColor(item.difficulty) + "22" }]}>
                <Text style={[s.diffText, { color: diffColor(item.difficulty) }]}>{diffLabel(item.difficulty)}</Text>
              </View>
              <Text style={s.cardName}>{item.name}</Text>
              <View style={s.cardActions}>
                <Pressable onPress={() => toggleActive(item)} hitSlop={8}>
                  <Ionicons name={item.is_active ? "eye" : "eye-off"} size={18} color={item.is_active ? "#10b981" : "#9ca3af"} />
                </Pressable>
                <Pressable onPress={() => openEdit(item)} hitSlop={8}>
                  <Ionicons name="pencil" size={18} color="#6366f1" />
                </Pressable>
                <Pressable onPress={() => deletePack(item)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
            </View>
            {item.description ? <Text style={s.cardDesc}>{item.description}</Text> : null}
            <View style={s.itemsList}>
              {(item.items ?? []).map((it, i) => (
                <View key={i} style={s.itemRow}>
                  <Ionicons name={TYPES.find((t) => t.key === it.type)?.icon as any ?? "gift"} size={14} color="#6366f1" />
                  <Text style={s.itemLabel}>{it.label}</Text>
                  <Text style={s.itemWeight}>×{it.weight}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={s.modalBg}>
          <ScrollView style={s.modalScroll} contentContainerStyle={s.modalBox}>
            <Text style={s.modalTitle}>{editing ? "Modifier le pack" : "Nouveau pack"}</Text>

            <TextInput style={s.input} placeholder="Nom du pack" value={name} onChangeText={setName} />
            <TextInput style={s.input} placeholder="Description (optionnel)" value={desc} onChangeText={setDesc} />

            <Text style={s.label}>Difficulté</Text>
            <View style={s.diffRow}>
              {DIFFICULTIES.map((d) => (
                <Pressable key={d.key} style={[s.diffBtn, diff === d.key && { backgroundColor: d.color, borderColor: d.color }]} onPress={() => setDiff(d.key)}>
                  <Text style={[s.diffBtnText, diff === d.key && { color: "white" }]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.label}>Items du pack</Text>
            {items.map((item, idx) => (
              <View key={idx} style={s.itemForm}>
                <View style={s.itemFormRow}>
                  <TextInput style={[s.input, { flex: 1 }]} placeholder="Label (ex: +50 XP bonus)" value={item.label} onChangeText={(v) => updateItem(idx, "label", v)} />
                  <Pressable onPress={() => removeItem(idx)} hitSlop={8} style={{ padding: 8 }}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </Pressable>
                </View>
                <View style={s.itemFormRow}>
                  {TYPES.map((t) => (
                    <Pressable key={t.key} style={[s.typeBtn, item.type === t.key && s.typeBtnActive]} onPress={() => updateItem(idx, "type", t.key)}>
                      <Ionicons name={t.icon as any} size={14} color={item.type === t.key ? "white" : "#6366f1"} />
                      <Text style={[s.typeBtnText, item.type === t.key && { color: "white" }]}>{t.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={s.itemFormRow}>
                  {item.type !== "free_reward" && (
                    <TextInput style={[s.input, { flex: 1 }]} placeholder="Valeur (ex: 50)" keyboardType="number-pad" value={item.value} onChangeText={(v) => updateItem(idx, "value", v)} />
                  )}
                  <TextInput style={[s.input, { width: 80 }]} placeholder="Poids" keyboardType="number-pad" value={item.weight} onChangeText={(v) => updateItem(idx, "weight", v)} />
                </View>
              </View>
            ))}

            <Pressable style={s.addItemBtn} onPress={addItem}>
              <Ionicons name="add" size={16} color="#6366f1" />
              <Text style={s.addItemText}>Ajouter un item</Text>
            </Pressable>

            <View style={s.modalActions}>
              <Pressable style={[s.btn, s.ghost]} onPress={() => setModalOpen(false)}><Text style={s.ghostText}>Annuler</Text></Pressable>
              <Pressable style={[s.btn, s.primary]} onPress={save} disabled={saving}><Text style={s.primaryText}>{saving ? "..." : "Enregistrer"}</Text></Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f8f8" },
  topBar: { backgroundColor: "white", paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  back: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { color: "#6366f1", fontWeight: "600" },
  title: { flex: 1, fontSize: 17, fontWeight: "700", textAlign: "center" },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "white", borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  cardInactive: { opacity: 0.5 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  diffText: { fontSize: 11, fontWeight: "700" },
  cardName: { flex: 1, fontSize: 15, fontWeight: "700" },
  cardDesc: { fontSize: 13, color: "#6b7280" },
  cardActions: { flexDirection: "row", gap: 12 },
  itemsList: { gap: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  itemLabel: { flex: 1, fontSize: 13, color: "#374151" },
  itemWeight: { fontSize: 12, color: "#9ca3af", fontWeight: "600" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalScroll: { maxHeight: "90%" },
  modalBox: { backgroundColor: "white", padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  label: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 14 },
  diffRow: { flexDirection: "row", gap: 8 },
  diffBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" },
  diffBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  itemForm: { backgroundColor: "#f9fafb", borderRadius: 10, padding: 10, gap: 8 },
  itemFormRow: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  typeBtnActive: { backgroundColor: "#6366f1", borderColor: "#6366f1" },
  typeBtnText: { fontSize: 11, fontWeight: "600", color: "#6366f1" },
  addItemBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#6366f1", borderStyle: "dashed", justifyContent: "center" },
  addItemText: { color: "#6366f1", fontWeight: "600", fontSize: 13 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: "center" },
  ghost: { backgroundColor: "#f3f4f6" },
  ghostText: { color: "#555", fontWeight: "600" },
  primary: { backgroundColor: "#6366f1" },
  primaryText: { color: "white", fontWeight: "700" },
});
