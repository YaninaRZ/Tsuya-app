import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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

type Reward = {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  is_claimed: boolean;
};

const ICONS = ["🎬", "🍕", "✈️", "🎮", "🛍️", "🍫", "🎵", "📚", "🏖️", "🍷", "🎁", "💆"];

export default function Shop() {
  const { session } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [coins, setCoins] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("50");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: rewardsData }, { data: profile }] = await Promise.all([
      supabase
        .from("rewards")
        .select("id, title, description, cost, is_claimed")
        .eq("user_id", session?.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("coins")
        .eq("id", session?.user.id)
        .single(),
    ]);
    setRewards(rewardsData ?? []);
    setCoins(profile?.coins ?? 0);
  }, [session]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  function openCreate() {
    setEditingReward(null);
    setTitle("");
    setDescription("");
    setCost("50");
    setSelectedIcon(ICONS[0]);
    setModalOpen(true);
  }

  function openEdit(reward: Reward) {
    setEditingReward(reward);
    setTitle(reward.title);
    setDescription(reward.description ?? "");
    setCost(String(reward.cost));
    setSelectedIcon(ICONS[0]);
    setModalOpen(true);
  }

  async function save() {
    if (!title.trim()) { Alert.alert("Oups", "Donne un nom à ta récompense."); return; }
    const parsedCost = parseInt(cost) || 10;
    if (parsedCost <= 0) { Alert.alert("Oups", "Le prix doit être supérieur à 0."); return; }
    setSaving(true);

    const payload = {
      title: `${selectedIcon} ${title.trim()}`,
      description: description.trim() || null,
      cost: parsedCost,
    };

    let error;
    if (editingReward) {
      ({ error } = await supabase.from("rewards").update(payload).eq("id", editingReward.id));
    } else {
      ({ error } = await supabase.from("rewards").insert({ ...payload, user_id: session?.user.id }));
    }

    setSaving(false);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setModalOpen(false);
    fetchData();
  }

  async function buy(reward: Reward) {
    if (reward.is_claimed) return;
    if (coins < reward.cost) {
      Alert.alert(
        "Pas assez de coins 😢",
        `Il te faut ${reward.cost} coins.\nTu en as ${coins} — continue tes habitudes !`,
      );
      return;
    }
    Alert.alert(
      "Acheter ?",
      `Dépenser ${reward.cost} coins pour « ${reward.title} » ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: async () => {
            const { error } = await supabase.rpc("claim_reward", { p_reward_id: reward.id });
            if (error) { Alert.alert("Erreur", error.message); return; }
            fetchData();
          },
        },
      ],
    );
  }

  async function deleteReward(id: string) {
    Alert.alert("Supprimer ?", "Supprimer cette récompense ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await supabase.from("rewards").delete().eq("id", id);
          setRewards((prev) => prev.filter((r) => r.id !== id));
        },
      },
    ]);
  }

  const available = rewards.filter((r) => !r.is_claimed);
  const claimed = rewards.filter((r) => r.is_claimed);

  return (
    <View style={s.screen}>
      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.coinPill}>
          <FontAwesome5 name="coins" size={14} color="#fbbf24" />
          <Text style={s.coinPillText}>{coins}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Section header */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>MES RÉCOMPENSES</Text>
          <Pressable style={s.addBtn} onPress={openCreate}>
            <Ionicons name="add" size={18} color="white" />
          </Pressable>
        </View>

        {available.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🎁</Text>
            <Text style={s.emptyText}>Aucune récompense.{"\n"}Appuie sur + pour en créer une !</Text>
          </View>
        )}

        {available.map((item) => {
          const canAfford = coins >= item.cost;
          return (
            <Pressable
              key={item.id}
              style={[s.card, !canAfford && s.cardDimmed]}
              onLongPress={() => openEdit(item)}
            >
              {/* Icon */}
              <View style={s.cardIcon}>
                <Text style={s.cardIconText}>{item.title.match(/^\S+/)?.[0] ?? "🎁"}</Text>
              </View>

              {/* Info */}
              <View style={s.cardInfo}>
                <Text style={s.cardTitle} numberOfLines={1}>
                  {item.title.replace(/^\S+\s*/, "")}
                </Text>
                {item.description ? (
                  <Text style={s.cardDesc} numberOfLines={1}>{item.description}</Text>
                ) : null}
              </View>

              {/* Right: cost + buy */}
              <View style={s.cardRight}>
                <View style={s.costRow}>
                  <FontAwesome5 name="coins" size={11} color="#fbbf24" />
                  <Text style={s.costText}>{item.cost}</Text>
                </View>
                <Pressable
                  style={[s.buyBtn, !canAfford && s.buyBtnDisabled]}
                  onPress={() => buy(item)}
                >
                  <Text style={[s.buyBtnText, !canAfford && s.buyBtnTextDisabled]}>
                    Acheter
                  </Text>
                </Pressable>
                <Pressable onPress={() => deleteReward(item.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={14} color="#4a3a6a" />
                </Pressable>
              </View>
            </Pressable>
          );
        })}

        {/* Claimed section */}
        {claimed.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <View style={s.divider} />
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>RÉCLAMÉES</Text>
            </View>
            {claimed.map((item) => (
              <View key={item.id} style={[s.card, s.cardClaimed]}>
                <View style={[s.cardIcon, s.cardIconClaimed]}>
                  <Text style={s.cardIconText}>{item.title.match(/^\S+/)?.[0] ?? "🎁"}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardTitleClaimed} numberOfLines={1}>
                    {item.title.replace(/^\S+\s*/, "")}
                  </Text>
                </View>
                <View style={s.costRow}>
                  <FontAwesome5 name="coins" size={11} color="#4a3a6a" />
                  <Text style={s.costTextClaimed}>{item.cost}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal création / édition */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>
              {editingReward ? "Modifier" : "Nouvelle récompense"}
            </Text>

            {/* Sélecteur d'icône */}
            <Text style={s.modalLabel}>Icône</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={s.iconRow}>
                {ICONS.map((icon) => (
                  <Pressable
                    key={icon}
                    style={[s.iconOption, selectedIcon === icon && s.iconOptionActive]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Text style={s.iconOptionText}>{icon}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <TextInput
              style={s.input}
              placeholder="Nom (ex: Séance ciné)"
              placeholderTextColor="#6b5a8a"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={s.input}
              placeholder="Description (optionnel)"
              placeholderTextColor="#6b5a8a"
              value={description}
              onChangeText={setDescription}
            />
            <TextInput
              style={s.input}
              placeholder="Prix en coins"
              placeholderTextColor="#6b5a8a"
              keyboardType="number-pad"
              value={cost}
              onChangeText={setCost}
            />

            <View style={s.modalActions}>
              <Pressable style={[s.modalBtn, s.modalBtnGhost]} onPress={() => setModalOpen(false)}>
                <Text style={s.modalBtnGhostText}>Annuler</Text>
              </Pressable>
              <Pressable style={[s.modalBtn, s.modalBtnPrimary]} onPress={save} disabled={saving}>
                <Text style={s.modalBtnPrimaryText}>{saving ? "..." : editingReward ? "Enregistrer" : "Créer"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const BG = "#ffffff";
const CARD_BG = "#ffffff";
const BAR_BG = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#6b7280";
const TEXT_DIM = "#9ca3af";
const PURPLE = "#6366f1";

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  topBar: {
    backgroundColor: BAR_BG,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  screenTitle: { color: TEXT_PRIMARY, fontSize: 20, fontWeight: "700" },
  coinPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef9c3",
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coinPillText: { color: "#fbbf24", fontWeight: "700", fontSize: 14 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionLabel: { color: TEXT_DIM, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingTop: 48, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: TEXT_DIM, textAlign: "center", lineHeight: 22, fontSize: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    gap: 10,
  },
  cardDimmed: { opacity: 0.5 },
  cardClaimed: { opacity: 0.4, backgroundColor: BAR_BG, borderColor: "#2d2045" },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardIconClaimed: { backgroundColor: "#f3f4f6" },
  cardIconText: { fontSize: 22 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: "600" },
  cardTitleClaimed: { color: TEXT_DIM, fontSize: 14, textDecorationLine: "line-through" },
  cardDesc: { color: TEXT_DIM, fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 6, flexShrink: 0 },
  costRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  costText: { color: "#fbbf24", fontWeight: "700", fontSize: 13 },
  costTextClaimed: { color: "#4a3a6a", fontSize: 13 },
  buyBtn: {
    backgroundColor: PURPLE,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  buyBtnDisabled: { backgroundColor: "#2d2045" },
  buyBtnText: { color: TEXT_PRIMARY, fontSize: 12, fontWeight: "700" },
  buyBtnTextDisabled: { color: TEXT_DIM },
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 12 },
  modalBg: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalBox: {
    backgroundColor: BAR_BG,
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
  },
  modalTitle: { color: TEXT_PRIMARY, fontSize: 18, fontWeight: "700", marginBottom: 4 },
  modalLabel: { color: TEXT_MUTED, fontSize: 12, fontWeight: "600" },
  iconRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOptionActive: { borderColor: PURPLE, backgroundColor: "#eef2ff" },
  iconOptionText: { fontSize: 22 },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 14,
    color: TEXT_PRIMARY,
    backgroundColor: "#f9fafb",
    fontSize: 15,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center" },
  modalBtnGhost: { backgroundColor: "#f3f4f6" },
  modalBtnGhostText: { color: TEXT_MUTED, fontWeight: "600" },
  modalBtnPrimary: { backgroundColor: PURPLE },
  modalBtnPrimaryText: { color: "white", fontWeight: "700" },
});
