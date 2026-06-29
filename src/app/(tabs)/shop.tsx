import ConfirmModal from "@/components/ConfirmModal";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useTheme, type Theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import CatCoin from "@/components/CatCoin";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Svg, { Circle } from "react-native-svg";

type Reward = {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  is_claimed: boolean;
};

const ICONS = ["🎬", "🍕", "✈️", "🎮", "🛍️", "🍫", "🎵", "📚", "🏖️", "🍷", "🎁", "💆"];

function CoinArc({ cost, canAfford, size = 56 }: { cost: number; canAfford: boolean; size?: number }) {
  const sw = 4;
  const r = (size - sw * 2) / 2;
  const cx = size / 2; const cy = size / 2;
  const full = 2 * Math.PI * r;
  const arc = full * 0.8;
  const color = canAfford ? "#3b82f6" : "#cbd5e1";
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "126deg" }] }}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw}
          strokeDasharray={`${arc} ${full}`} strokeLinecap="round" />
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${arc} ${full}`} strokeLinecap="round" />
      </Svg>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: 14, fontWeight: "800", color: canAfford ? "#1e40af" : "#94a3b8" }}>{cost}</Text>
        <Text style={{ fontSize: 9, color: "#94a3b8", fontWeight: "600", marginTop: -2 }}>coins</Text>
      </View>
    </View>
  );
}

export default function Shop() {
  const t = useTheme();
  const s = makeStyles(t);
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
  const [buyTarget, setBuyTarget] = useState<Reward | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reward | null>(null);

  const fetchData = useCallback(async () => {
    const [{ data: rewardsData }, { data: profile }] = await Promise.all([
      supabase.from("rewards").select("id, title, description, cost, is_claimed").eq("user_id", session?.user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("coins").eq("id", session?.user.id).single(),
    ]);
    setRewards(rewardsData ?? []);
    setCoins(profile?.coins ?? 0);
  }, [session]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  function openCreate() {
    setEditingReward(null); setTitle(""); setDescription(""); setCost("50"); setSelectedIcon(ICONS[0]); setModalOpen(true);
  }

  function openEdit(reward: Reward) {
    setEditingReward(reward); setTitle(reward.title.replace(/^\S+\s*/, "")); setDescription(reward.description ?? ""); setCost(String(reward.cost)); setSelectedIcon(ICONS[0]); setModalOpen(true);
  }

  async function save() {
    if (!title.trim()) { Alert.alert("Oups", "Donne un nom à ta récompense."); return; }
    const parsedCost = parseInt(cost) || 10;
    setSaving(true);
    const payload = { title: `${selectedIcon} ${title.trim()}`, description: description.trim() || null, cost: parsedCost };
    let error;
    if (editingReward) {
      ({ error } = await supabase.from("rewards").update(payload).eq("id", editingReward.id));
    } else {
      ({ error } = await supabase.from("rewards").insert({ ...payload, user_id: session?.user.id }));
    }
    setSaving(false);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setModalOpen(false); fetchData();
  }

  async function confirmBuy() {
    if (!buyTarget) return;
    const { error } = await supabase.rpc("claim_reward", { p_reward_id: buyTarget.id });
    setBuyTarget(null);
    if (error) { Alert.alert("Erreur", error.message); return; }
    fetchData();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await supabase.from("rewards").delete().eq("id", deleteTarget.id);
    setRewards((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  const available = rewards.filter((r) => !r.is_claimed);
  const claimed = rewards.filter((r) => r.is_claimed);

  return (
    <View style={s.screen}>
      <ConfirmModal
        visible={!!buyTarget}
        title="Acheter cette récompense ?"
        message={buyTarget ? `Dépenser ${buyTarget.cost} coins pour « ${buyTarget.title.replace(/^\S+\s*/, "")} » ?` : ""}
        confirmLabel="Confirmer"
        onConfirm={confirmBuy}
        onCancel={() => setBuyTarget(null)}
      />
      <ConfirmModal
        visible={!!deleteTarget}
        title="Supprimer ?"
        message="Cette récompense sera définitivement supprimée."
        confirmLabel="Supprimer"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Top bar */}
      <View style={s.topBar}>
        <Text style={s.pageTitle}>Récompenses</Text>
        <View style={s.coinPill}>
          <CatCoin size={28} style={{ marginVertical: -4 }} />
          <Text style={s.coinPillText}>{coins}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Hero banner */}
        <View style={s.heroBanner}>
          <View style={s.heroLeft}>
            <Text style={s.heroTitle}>Tes efforts méritent{"\n"}une récompense ! 🎉</Text>
            <Text style={s.heroSub}>Dépense tes coins pour te faire plaisir</Text>
          </View>
          <Image source={require("../../../assets/images/happy-tsuya.png")} style={s.heroImg} resizeMode="contain" pointerEvents="none" />
        </View>

        {/* Section header */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>MES RÉCOMPENSES</Text>
          <Pressable style={s.addBtn} onPress={openCreate}>
            <Ionicons name="add" size={18} color="white" />
          </Pressable>
        </View>

        {available.length === 0 && (
          <View style={s.empty}>
            <Image source={require("../../../assets/images/money/cat-cupon-free-reward.png")} style={{ width: 140, height: 140 }} resizeMode="contain" />
            <Text style={s.emptyText}>Aucune récompense.{"\n"}Appuie sur + pour en créer une !</Text>
          </View>
        )}

        {available.map((item) => {
          const canAfford = coins >= item.cost;
          return (
            <Swipeable
              key={item.id}
              overshootRight={false}
              renderRightActions={() => (
                <Pressable style={s.deleteBox} onPress={() => setDeleteTarget(item)}>
                  <Ionicons name="trash" size={22} color="white" />
                  <Text style={s.deleteLabel}>Supprimer</Text>
                </Pressable>
              )}
            >
              <Pressable style={s.card} onPress={() => setBuyTarget(item)} onLongPress={() => openEdit(item)}>
                <View style={s.cardLeft}>
                  {(() => { const e = item.title.match(/^\S+/)?.[0] ?? "🎁"; return e === "🎁" ? <Image source={require("../../../assets/images/money/cat-cupon-free-reward.png")} style={{ width: 36, height: 36 }} resizeMode="contain" /> : <Text style={s.cardEmoji}>{e}</Text>; })()}
                  <View>
                    <Text style={s.cardTitle} numberOfLines={1}>{item.title.replace(/^\S+\s*/, "")}</Text>
                    {item.description
                      ? <Text style={s.cardDesc} numberOfLines={1}>{item.description}</Text>
                      : <Text style={s.cardDesc}>{canAfford ? "Tu peux l'acheter !" : `Il te manque ${item.cost - coins} coins`}</Text>
                    }
                  </View>
                </View>
                <CoinArc cost={item.cost} canAfford={canAfford} />
              </Pressable>
            </Swipeable>
          );
        })}

        {/* Claimed section */}
        {claimed.length > 0 && (
          <>
            <View style={s.divider} />
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>OBTENUES</Text>
            </View>
            {claimed.map((item) => (
              <View key={item.id} style={[s.card, s.cardClaimed]}>
                <View style={s.cardLeft}>
                  {(() => { const e = item.title.match(/^\S+/)?.[0] ?? "🎁"; return e === "🎁" ? <Image source={require("../../../assets/images/money/cat-cupon-free-reward.png")} style={{ width: 36, height: 36, opacity: 0.4 }} resizeMode="contain" /> : <Text style={[s.cardEmoji, { opacity: 0.4 }]}>{e}</Text>; })()}
                  <View>
                    <Text style={s.cardTitleClaimed} numberOfLines={1}>{item.title.replace(/^\S+\s*/, "")}</Text>
                    <Text style={s.cardDesc}>Réclamée ✓</Text>
                  </View>
                </View>
                <View style={s.costPill}>
                  <CatCoin size={20} style={{ marginVertical: -3 }} />
                  <Text style={s.costPillText}>{item.cost}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Modal création / édition */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{editingReward ? "Modifier" : "Nouvelle récompense"}</Text>

            <Text style={s.modalLabel}>Icône</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.iconRow}>
                {ICONS.map((icon) => (
                  <Pressable key={icon} style={[s.iconOption, selectedIcon === icon && s.iconOptionActive]} onPress={() => setSelectedIcon(icon)}>
                    <Text style={s.iconOptionText}>{icon}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <TextInput style={s.input} placeholder="Nom (ex: Séance ciné)" placeholderTextColor={t.placeholder} value={title} onChangeText={setTitle} />
            <TextInput style={s.input} placeholder="Description (optionnel)" placeholderTextColor={t.placeholder} value={description} onChangeText={setDescription} />
            <TextInput style={s.input} placeholder="Prix en coins" placeholderTextColor={t.placeholder} keyboardType="number-pad" value={cost} onChangeText={setCost} />

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

function makeStyles(t: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background },

    topBar: { paddingTop: 72, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    pageTitle: { fontSize: 24, fontWeight: "800", color: t.text },
    coinPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    coinPillText: { color: t.blueDark, fontWeight: "700", fontSize: 14 },

    heroBanner: { marginHorizontal: 16, marginBottom: 8, backgroundColor: t.headerBg, borderRadius: 20, paddingLeft: 20, paddingTop: 24, paddingBottom: 24, flexDirection: "row", alignItems: "center", overflow: "hidden", height: 150 },
    heroLeft: { flex: 1, gap: 6 },
    heroTitle: { fontSize: 20, fontWeight: "800", color: t.text, lineHeight: 26 },
    heroSub: { fontSize: 13, color: t.textSecondary, fontWeight: "500", lineHeight: 18 },
    heroImg: { width: 160, height: 190, position: "absolute", right: -30, bottom: -30 },

    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
    sectionLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
    addBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center" },

    empty: { alignItems: "center", paddingTop: 48, gap: 10 },
    emptyIcon: { fontSize: 40 },
    emptyText: { color: "#94a3b8", textAlign: "center", lineHeight: 22, fontSize: 14 },

    card: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: t.card, borderWidth: 1, borderColor: t.borderLight, borderRadius: 16, marginHorizontal: 16, marginBottom: 10, padding: 16, shadowColor: "#0f172a", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
    cardClaimed: { opacity: 0.45 },
    cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    cardEmoji: { fontSize: 28 },
    cardTitle: { fontSize: 15, fontWeight: "700", color: t.text },
    cardTitleClaimed: { fontSize: 15, fontWeight: "600", color: "#94a3b8", textDecorationLine: "line-through" },
    cardDesc: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
    deleteBox: { backgroundColor: "#ef4444", justifyContent: "center", alignItems: "center", width: 80, borderRadius: 16, gap: 4, marginBottom: 10, marginRight: 16 },
    deleteLabel: { color: "white", fontWeight: "600", fontSize: 11 },

    costPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: t.surfaceAlt, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    costPillText: { color: "#94a3b8", fontWeight: "600", fontSize: 12 },

    divider: { height: 1, backgroundColor: t.borderLight, marginHorizontal: 16, marginTop: 8 },

    modalBg: { flex: 1, justifyContent: "flex-end", backgroundColor: t.overlay },
    modalBox: { backgroundColor: t.card, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12 },
    modalTitle: { fontSize: 18, fontWeight: "700", color: t.text, marginBottom: 4 },
    modalLabel: { color: t.textSecondary, fontSize: 12, fontWeight: "600" },
    iconRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
    iconOption: { width: 44, height: 44, borderRadius: 10, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" },
    iconOptionActive: { borderColor: "#3b82f6", backgroundColor: t.blueLight },
    iconOptionText: { fontSize: 22 },
    input: { borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 14, fontSize: 15, color: t.text, backgroundColor: t.input },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
    modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center" },
    modalBtnGhost: { backgroundColor: t.ghostBg },
    modalBtnGhostText: { color: t.ghostText, fontWeight: "600" },
    modalBtnPrimary: { backgroundColor: "#3b82f6" },
    modalBtnPrimaryText: { color: "white", fontWeight: "700" },
  });
}
