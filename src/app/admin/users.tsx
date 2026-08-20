import { supabase } from "@/lib/supabase";
import ResultModal from "@/components/ResultModal";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

type UserRow = {
  id: string;
  pseudo: string;
  level: number;
  xp_total: number;
  coins: number;
  role: string | null;
  status: string | null;
  badge_count?: number;
};

const BADGE_LABELS: Record<string, string> = {
  "blue-paw": "Premier pas", "cats-blue": "Challenge créé", "coins-fish": "Riche en coins",
  "green-jungle": "Jungle verte", "money-jungle": "Grand dépensier", "sleep-cat": "Flemme royale",
  "sun-cat": "Soleil levant", "two-cat": "Populaire", "two-paws": "Nouveau look",
};

async function callAdmin(action: string, payload: object) {
  const { data: { session } } = await supabase.auth.getSession();
  return supabase.functions.invoke(
    action === "create" ? "admin-create-user" : "admin-manage-user",
    {
      body: action === "create" ? payload : { action, ...payload },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    },
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filtered, setFiltered] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [acting, setActing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPseudo, setNewPseudo] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const [{ data: profiles }, { data: badges }] = await Promise.all([
      supabase.from("profiles").select("id, pseudo, level, xp_total, coins, role, status").order("pseudo"),
      supabase.from("user_badges").select("user_id"),
    ]);
    const badgesByUser: Record<string, number> = {};
    for (const b of (badges ?? [])) badgesByUser[b.user_id] = (badgesByUser[b.user_id] ?? 0) + 1;
    const rows: UserRow[] = (profiles ?? []).map((p: any) => ({ ...p, badge_count: badgesByUser[p.id] ?? 0 }));
    setUsers(rows);
    setFiltered(rows);
    setLoading(false);
  }

  function onSearch(q: string) {
    setSearch(q);
    setFiltered(users.filter((u) => u.pseudo.toLowerCase().includes(q.toLowerCase())));
  }

  async function openUser(user: UserRow) {
    setSelected(user);
    const { data } = await supabase.from("user_badges").select("badge_key").eq("user_id", user.id);
    setUserBadges((data ?? []).map((b: any) => b.badge_key));
  }

  function closeDetail() { setSelected(null); setUserBadges([]); }

  async function toggleRole() {
    if (!selected) return;
    const newRole = selected.role === "admin" ? "user" : "admin";
    Alert.alert("Changer le rôle ?", `Passer ${selected.pseudo} en « ${newRole} » ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Confirmer", onPress: async () => {
          setActing(true);
          const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", selected.id);
          setActing(false);
          if (error) { setResult({ success: false, message: "Impossible de changer le rôle." }); return; }
          const updated = { ...selected, role: newRole };
          setSelected(updated);
          setUsers((p) => p.map((u) => u.id === selected.id ? { ...u, role: newRole } : u));
          setFiltered((p) => p.map((u) => u.id === selected.id ? { ...u, role: newRole } : u));
          setResult({ success: true, message: `${selected.pseudo} est maintenant « ${newRole} ».` });
        },
      },
    ]);
  }

  async function banUser() {
    if (!selected) return;
    const isBanned = selected.status === "banned";
    Alert.alert(
      isBanned ? "Débannir ?" : "Bannir ?",
      isBanned
        ? `${selected.pseudo} pourra à nouveau se connecter.`
        : `${selected.pseudo} ne pourra plus se connecter.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: isBanned ? "Débannir" : "Bannir", style: isBanned ? "default" : "destructive",
          onPress: async () => {
            setActing(true);
            const { error } = await callAdmin(isBanned ? "unban" : "ban", { user_id: selected.id });
            setActing(false);
            if (error) { setResult({ success: false, message: "Action impossible. Réessaie plus tard." }); return; }
            const newStatus = isBanned ? "active" : "banned";
            const updated = { ...selected, status: newStatus };
            setSelected(updated);
            setUsers((p) => p.map((u) => u.id === selected.id ? { ...u, status: newStatus } : u));
            setFiltered((p) => p.map((u) => u.id === selected.id ? { ...u, status: newStatus } : u));
            setResult({ success: true, message: isBanned ? `${selected.pseudo} a été débanni.` : `${selected.pseudo} a été banni.` });
          },
        },
      ],
    );
  }

  async function deleteUser() {
    if (!selected) return;
    Alert.alert("Supprimer ce compte ?", `Toutes les données de ${selected.pseudo} seront effacées définitivement.`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive", onPress: async () => {
          setActing(true);
          const { error } = await callAdmin("delete", { user_id: selected.id });
          setActing(false);
          if (error) { setResult({ success: false, message: "Suppression impossible. Réessaie plus tard." }); return; }
          setUsers((p) => p.filter((u) => u.id !== selected.id));
          setFiltered((p) => p.filter((u) => u.id !== selected.id));
          closeDetail();
          setResult({ success: true, message: `Le compte a été supprimé définitivement.` });
        },
      },
    ]);
  }

  async function createUser() {
    if (!newEmail.trim() || !newPseudo.trim() || !newPassword.trim()) {
      Alert.alert("Champs requis", "Email, pseudo et mot de passe sont obligatoires.");
      return;
    }
    setCreating(true);
    const savedPseudo = newPseudo.trim();
    const { error } = await callAdmin("create", { email: newEmail.trim(), pseudo: savedPseudo, password: newPassword });
    setCreating(false);
    if (error) { setResult({ success: false, message: "Création impossible. L'email est peut-être déjà utilisé." }); return; }
    setNewEmail(""); setNewPseudo(""); setNewPassword("");
    setCreateOpen(false);
    fetchUsers();
    setResult({ success: true, message: `Le compte de ${savedPseudo} a été créé.` });
  }

  const isBanned = selected?.status === "banned";

  return (
    <View style={s.screen}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.push("/(tabs)/profil" as any)} style={s.back}>
          <Ionicons name="arrow-back" size={22} color="#6366f1" />
          <Text style={s.backText}>Profil</Text>
        </Pressable>
        <Text style={s.title}>Utilisateurs</Text>
        <Pressable style={s.addBtn} onPress={() => setCreateOpen(true)}>
          <Ionicons name="add" size={20} color="white" />
        </Pressable>
      </View>

      <View style={s.searchBar}>
        <Ionicons name="search" size={16} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher par pseudo..."
          value={search}
          onChangeText={onSearch}
          clearButtonMode="while-editing"
        />
        {!loading && <Text style={s.countLabel}>{filtered.length}</Text>}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#6366f1" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<Text style={s.empty}>Aucun utilisateur trouvé</Text>}
          renderItem={({ item }) => (
            <Pressable style={[s.card, item.status === "banned" && s.cardBanned]} onPress={() => openUser(item)}>
              <View style={[s.avatar, item.status === "banned" && { backgroundColor: "#9ca3af" }]}>
                <Text style={s.avatarLetter}>{item.pseudo.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.cardTop}>
                  <Text style={s.pseudo}>{item.pseudo}</Text>
                  {item.role === "admin" && (
                    <View style={s.rolePill}>
                      <Text style={s.rolePillText}>admin</Text>
                    </View>
                  )}
                  {item.status === "banned" && (
                    <View style={s.bannedPill}>
                      <Text style={s.bannedPillText}>banni</Text>
                    </View>
                  )}
                </View>
                <Text style={s.stats}>
                  Niv.{item.level} · {item.xp_total} XP · {item.badge_count} badge{item.badge_count !== 1 ? "s" : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </Pressable>
          )}
        />
      )}

      {/* User detail modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={closeDetail}>
        <View style={s.modalBg}>
          <ScrollView style={{ maxHeight: "85%" }}>
            <View style={s.modalBox}>
              <View style={s.modalHeader}>
                <View style={[s.avatar, { width: 48, height: 48, borderRadius: 24 }, isBanned && { backgroundColor: "#9ca3af" }]}>
                  <Text style={[s.avatarLetter, { fontSize: 20 }]}>{selected?.pseudo.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={s.modalTitle}>{selected?.pseudo}</Text>
                    {isBanned && <View style={s.bannedPill}><Text style={s.bannedPillText}>banni</Text></View>}
                  </View>
                  <Text style={s.modalSub}>Niv.{selected?.level} · {selected?.xp_total} XP · {selected?.coins} coins</Text>
                </View>
              </View>

              {/* Badges */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Badges ({userBadges.length})</Text>
                {userBadges.length === 0
                  ? <Text style={s.noBadge}>Aucun badge</Text>
                  : (
                    <View style={s.badgesList}>
                      {userBadges.map((key) => (
                        <View key={key} style={s.badgeChip}>
                          <Ionicons name="ribbon" size={12} color="#6366f1" />
                          <Text style={s.badgeChipText}>{BADGE_LABELS[key] ?? key}</Text>
                        </View>
                      ))}
                    </View>
                  )}
              </View>

              {/* Actions */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Actions</Text>
                <View style={s.actionsGrid}>
                  <ActionBtn
                    icon={selected?.role === "admin" ? "person" : "shield-checkmark-outline"}
                    label={selected?.role === "admin" ? "Rétrograder" : "Passer admin"}
                    color="#6366f1"
                    bg="#eef2ff"
                    onPress={toggleRole}
                    disabled={acting}
                  />
                  <ActionBtn
                    icon={isBanned ? "checkmark-circle-outline" : "ban-outline"}
                    label={isBanned ? "Débannir" : "Bannir"}
                    color={isBanned ? "#10b981" : "#f59e0b"}
                    bg={isBanned ? "#f0fdf4" : "#fffbeb"}
                    onPress={banUser}
                    disabled={acting}
                  />
                  <ActionBtn
                    icon="trash-outline"
                    label="Supprimer"
                    color="#ef4444"
                    bg="#fef2f2"
                    onPress={deleteUser}
                    disabled={acting}
                  />
                </View>
                {acting && <ActivityIndicator color="#6366f1" style={{ marginTop: 8 }} />}
              </View>

              <Pressable style={s.closeBtn} onPress={closeDetail}>
                <Text style={s.closeBtnText}>Fermer</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Create user modal */}
      <Modal visible={createOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={s.modalBg}>
          <ScrollView style={{ maxHeight: "80%" }} keyboardShouldPersistTaps="handled">
            <View style={s.modalBox}>
              <Text style={s.modalTitle}>Créer un compte</Text>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Pseudo</Text>
                <TextInput style={s.input} placeholder="pseudo123" value={newPseudo} onChangeText={setNewPseudo} autoCapitalize="none" />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Email</Text>
                <TextInput style={s.input} placeholder="user@exemple.com" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Mot de passe temporaire</Text>
                <TextInput style={s.input} placeholder="Min. 6 caractères" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              </View>

              <View style={s.modalActions}>
                <Pressable style={[s.btn, s.ghost]} onPress={() => setCreateOpen(false)}>
                  <Text style={s.ghostText}>Annuler</Text>
                </Pressable>
                <Pressable style={[s.btn, s.primary]} onPress={createUser} disabled={creating}>
                  <Text style={s.primaryText}>{creating ? "..." : "Créer"}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <ResultModal
        visible={!!result}
        success={result?.success ?? true}
        message={result?.message ?? ""}
        onClose={() => setResult(null)}
      />
    </View>
  );
}

function ActionBtn({ icon, label, color, bg, onPress, disabled }: {
  icon: string; label: string; color: string; bg: string;
  onPress: () => void; disabled?: boolean;
}) {
  return (
    <Pressable style={[s.actionBtn, { backgroundColor: bg }]} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[s.actionBtnText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f8f8" },
  topBar: { backgroundColor: "white", paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  back: { flexDirection: "row", alignItems: "center", gap: 4, width: 60 },
  backText: { color: "#6366f1", fontWeight: "600" },
  title: { flex: 1, fontSize: 17, fontWeight: "700", textAlign: "center" },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "white", margin: 16, marginBottom: 0, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  countLabel: { fontSize: 13, color: "#9ca3af" },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 14 },
  card: { backgroundColor: "white", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  cardBanned: { opacity: 0.65, borderColor: "#fca5a5" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "white", fontWeight: "700", fontSize: 16 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  pseudo: { fontSize: 15, fontWeight: "700", color: "#111827" },
  rolePill: { backgroundColor: "#f5f3ff", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: "#ddd6fe" },
  rolePillText: { fontSize: 11, fontWeight: "700", color: "#7c3aed" },
  bannedPill: { backgroundColor: "#fef2f2", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: "#fecaca" },
  bannedPillText: { fontSize: 11, fontWeight: "700", color: "#ef4444" },
  stats: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "white", padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 16, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalSub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, color: "#6b7280", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  noBadge: { color: "#9ca3af", fontSize: 13 },
  badgesList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badgeChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#eef2ff", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeChipText: { fontSize: 12, fontWeight: "600", color: "#6366f1" },
  actionsGrid: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 14 },
  actionBtnText: { fontSize: 12, fontWeight: "700" },
  closeBtn: { backgroundColor: "#f3f4f6", borderRadius: 10, padding: 14, alignItems: "center" },
  closeBtnText: { color: "#374151", fontWeight: "600", fontSize: 15 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 14, color: "#111827" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: "center" },
  ghost: { backgroundColor: "#f3f4f6" },
  ghostText: { color: "#555", fontWeight: "600" },
  primary: { backgroundColor: "#6366f1" },
  primaryText: { color: "white", fontWeight: "700" },
});
