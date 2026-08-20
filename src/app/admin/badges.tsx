import ResultModal from "@/components/ResultModal";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Badge = {
  id: string;
  key: string;
  label: string;
  description: string;
  image_color_url: string | null;
  image_grey_url: string | null;
};

type ImageSlot = "color" | "grey";

const EMPTY_FORM = { key: "", label: "", description: "" };

// Local assets for the 9 built-in badges — display only in admin, never saved to DB
const LOCAL_IMAGE_MAP: Record<string, { color: any; grey: any }> = {
  "blue-paw":     { color: require("../../../assets/images/badges/blue-paw-badge.png"),            grey: require("../../../assets/images/badges/grey-blue-paw-badge.png") },
  "cats-blue":    { color: require("../../../assets/images/badges/cats-blue-badge.png"),           grey: require("../../../assets/images/badges/grey-cats-blue-badge.png") },
  "coins-fish":   { color: require("../../../assets/images/badges/coins-fish-badge.png"),          grey: require("../../../assets/images/badges/grey-coins-fish-badge.png") },
  "green-jungle": { color: require("../../../assets/images/badges/green-jungle-badge.png"),        grey: require("../../../assets/images/badges/grey-green-jungle-badge.png") },
  "money-jungle": { color: require("../../../assets/images/badges/money-jungle-badge.png"),        grey: require("../../../assets/images/badges/grey-money-jungle-badge.png") },
  "sleep-cat":    { color: require("../../../assets/images/badges/sleep-cat-badge.png"),           grey: require("../../../assets/images/badges/grey-sleep-cat-badge.png") },
  "sun-cat":      { color: require("../../../assets/images/badges/sun-cat-badge.png"),             grey: require("../../../assets/images/badges/grey-sun-cat-badge.png") },
  "two-cat":      { color: require("../../../assets/images/badges/two-cat-badge.png"),             grey: require("../../../assets/images/badges/grey-two-cat-badge.png") },
  "two-paws":     { color: require("../../../assets/images/badges/two-paws-check-badge.png"),      grey: require("../../../assets/images/badges/grey-two-paws-check-badge.png") },
};

export default function AdminBadges() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Badge | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // Remote URL saved to DB (null = no remote image)
  const [colorPreview, setColorPreview] = useState<string | null>(null);
  const [greyPreview, setGreyPreview] = useState<string | null>(null);
  // Local asset shown when no remote URL (display only, never saved)
  const [colorLocal, setColorLocal] = useState<any>(null);
  const [greyLocal, setGreyLocal] = useState<any>(null);
  const [uploading, setUploading] = useState<ImageSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => { fetchBadges(); }, []);

  async function fetchBadges() {
    setLoading(true);
    const { data } = await supabase
      .from("badges")
      .select("id, key, label, description, image_color_url, image_grey_url")
      .order("created_at");
    setBadges(data ?? []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setColorPreview(null);
    setGreyPreview(null);
    setColorLocal(null);
    setGreyLocal(null);
    setModalOpen(true);
  }

  function openEdit(badge: Badge) {
    setEditing(badge);
    setForm({ key: badge.key, label: badge.label, description: badge.description });
    setColorPreview(badge.image_color_url);
    setGreyPreview(badge.image_grey_url);
    // Show local assets as fallback when no DB URL
    const local = LOCAL_IMAGE_MAP[badge.key];
    setColorLocal(!badge.image_color_url && local ? local.color : null);
    setGreyLocal(!badge.image_grey_url && local ? local.grey : null);
    setModalOpen(true);
  }

  async function pickImage(slot: ImageSlot) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "png";
    const badgeKey = form.key.trim() || editing?.key || `badge-${Date.now()}`;
    const path = `${badgeKey}/${slot}-${Date.now()}.${ext}`;

    setUploading(slot);
    try {
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from("badge-images")
        .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

      if (uploadErr) { Alert.alert("Erreur upload", uploadErr.message); return; }

      const { data: { publicUrl } } = supabase.storage.from("badge-images").getPublicUrl(path);
      if (slot === "color") { setColorPreview(publicUrl); setColorLocal(null); }
      else { setGreyPreview(publicUrl); setGreyLocal(null); }
    } finally {
      setUploading(null);
    }
  }

  function removeImage(slot: ImageSlot) {
    if (slot === "color") { setColorPreview(null); setColorLocal(null); }
    else { setGreyPreview(null); setGreyLocal(null); }
  }

  async function save() {
    const { key, label, description } = form;
    if (!key.trim()) { Alert.alert("Champ requis", "La clé est obligatoire."); return; }
    if (!label.trim()) { Alert.alert("Champ requis", "Le label est obligatoire."); return; }
    if (!description.trim()) { Alert.alert("Champ requis", "La description est obligatoire."); return; }

    setSaving(true);
    const payload = {
      label: label.trim(),
      description: description.trim(),
      image_color_url: colorPreview ?? null,
      image_grey_url: greyPreview ?? null,
    };

    if (editing) {
      const { error } = await supabase.from("badges").update(payload).eq("id", editing.id);
      if (error) { setSaving(false); setResult({ success: false, message: error.message }); return; }
    } else {
      const { error } = await supabase.from("badges").insert({ key: key.trim(), ...payload });
      if (error) {
        setSaving(false);
        setResult({ success: false, message: error.code === "23505" ? "Cette clé existe déjà." : error.message });
        return;
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchBadges();
    setResult({ success: true, message: editing ? `Le badge « ${label.trim()} » a été mis à jour.` : `Le badge « ${label.trim()} » a été créé.` });
  }

  async function deleteBadge(badge: Badge) {
    const { count } = await supabase
      .from("user_badges")
      .select("*", { count: "exact", head: true })
      .eq("badge_key", badge.key);

    const warn = count && count > 0
      ? `\n\n⚠️ ${count} utilisateur(s) possèdent ce badge — il sera retiré de leurs profils.`
      : "";

    Alert.alert("Supprimer ce badge ?", `« ${badge.label} »${warn}`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive", onPress: async () => {
          if (count && count > 0) {
            await supabase.from("user_badges").delete().eq("badge_key", badge.key);
          }
          const { error } = await supabase.from("badges").delete().eq("id", badge.id);
          if (error) { setResult({ success: false, message: "Suppression impossible. Réessaie plus tard." }); return; }
          fetchBadges();
          setResult({ success: true, message: `Le badge « ${badge.label} » a été supprimé.` });
        },
      },
    ]);
  }

  return (
    <View style={s.screen}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.push("/(tabs)/profil" as any)} style={s.back}>
          <Ionicons name="arrow-back" size={22} color="#6366f1" />
          <Text style={s.backText}>Profil</Text>
        </Pressable>
        <Text style={s.title}>Badges</Text>
        <Pressable style={s.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={20} color="white" />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#6366f1" />
      ) : (
        <FlatList
          data={badges}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="ribbon-outline" size={40} color="#e5e7eb" />
              <Text style={s.emptyText}>Aucun badge — crée le premier !</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardImages}>
                {item.image_color_url
                  ? <Image source={{ uri: item.image_color_url }} style={s.cardThumb} resizeMode="contain" />
                  : <View style={[s.cardThumb, s.cardThumbEmpty]}>
                      <Ionicons name="ribbon" size={22} color="#c7d2fe" />
                    </View>
                }
                {item.image_grey_url
                  ? <Image source={{ uri: item.image_grey_url }} style={[s.cardThumb, { opacity: 0.5 }]} resizeMode="contain" />
                  : <View style={[s.cardThumb, s.cardThumbEmpty, { opacity: 0.5 }]}>
                      <Ionicons name="ribbon" size={22} color="#c7d2fe" />
                    </View>
                }
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={s.cardTop}>
                  <Text style={s.cardLabel}>{item.label}</Text>
                  <Text style={s.cardKey}>{item.key}</Text>
                </View>
                <Text style={s.cardDesc}>{item.description}</Text>
              </View>
              <View style={s.cardActions}>
                <Pressable onPress={() => openEdit(item)} hitSlop={8}>
                  <Ionicons name="pencil" size={18} color="#6366f1" />
                </Pressable>
                <Pressable onPress={() => deleteBadge(item)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <ResultModal
        visible={!!result}
        success={result?.success ?? true}
        message={result?.message ?? ""}
        onClose={() => setResult(null)}
      />

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={s.modalBg}>
          <ScrollView style={{ maxHeight: "92%" }} keyboardShouldPersistTaps="handled">
            <View style={s.modalBox}>
              <Text style={s.modalTitle}>{editing ? "Modifier le badge" : "Nouveau badge"}</Text>

              {/* Key */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>Clé unique (ex: fire-streak)</Text>
                <TextInput
                  style={[s.input, !!editing && s.inputDisabled]}
                  placeholder="fire-streak"
                  value={form.key}
                  onChangeText={(v) => setForm((f) => ({ ...f, key: v.toLowerCase().replace(/\s+/g, "-") }))}
                  autoCapitalize="none"
                  editable={!editing}
                />
                {!!editing && <Text style={s.fieldHint}>La clé ne peut pas être modifiée après création.</Text>}
              </View>

              {/* Label */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>Label affiché</Text>
                <TextInput
                  style={s.input}
                  placeholder="ex: Flamme de feu"
                  value={form.label}
                  onChangeText={(v) => setForm((f) => ({ ...f, label: v }))}
                />
              </View>

              {/* Description */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>Description / condition</Text>
                <TextInput
                  style={[s.input, { height: 72, textAlignVertical: "top" }]}
                  placeholder="ex: 10 jours consécutifs d'activité"
                  value={form.description}
                  onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                  multiline
                />
              </View>

              {/* Images */}
              <Text style={s.fieldLabel}>Images</Text>
              <View style={s.imagesRow}>
                <ImagePickerSlot
                  label="Couleur (débloqué)"
                  uri={colorPreview}
                  localAsset={colorLocal}
                  loading={uploading === "color"}
                  onPick={() => pickImage("color")}
                  onRemove={() => removeImage("color")}
                />
                <ImagePickerSlot
                  label="Grisé (verrouillé)"
                  uri={greyPreview}
                  localAsset={greyLocal}
                  loading={uploading === "grey"}
                  onPick={() => pickImage("grey")}
                  onRemove={() => removeImage("grey")}
                  grey
                />
              </View>

              <View style={s.modalActions}>
                <Pressable style={[s.btn, s.ghost]} onPress={() => setModalOpen(false)}>
                  <Text style={s.ghostText}>Annuler</Text>
                </Pressable>
                <Pressable style={[s.btn, s.primary]} onPress={save} disabled={saving || uploading !== null}>
                  <Text style={s.primaryText}>{saving ? "..." : editing ? "Enregistrer" : "Créer"}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function ImagePickerSlot({
  label, uri, localAsset, loading, onPick, onRemove, grey,
}: {
  label: string;
  uri: string | null;
  localAsset?: any;
  loading: boolean;
  onPick: () => void;
  onRemove: () => void;
  grey?: boolean;
}) {
  const hasImage = !!uri || !!localAsset;
  const isLocal = !uri && !!localAsset;
  const source = uri ? { uri } : localAsset ?? null;

  return (
    <View style={s.imgSlot}>
      <Text style={s.imgSlotLabel}>{label}</Text>
      <Pressable style={s.imgBox} onPress={onPick} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#6366f1" />
        ) : source ? (
          <Image
            source={source}
            style={[s.imgPreview, grey && { opacity: 0.5 }]}
            resizeMode="contain"
          />
        ) : (
          <View style={s.imgPlaceholder}>
            <Ionicons name="image-outline" size={28} color="#d1d5db" />
            <Text style={s.imgPlaceholderText}>Choisir</Text>
          </View>
        )}
      </Pressable>
      {hasImage && !loading && (
        <View style={s.imgActions}>
          <Pressable style={s.imgActionBtn} onPress={onPick}>
            <Ionicons name="pencil" size={13} color="#6366f1" />
            <Text style={s.imgActionText}>{isLocal ? "Remplacer" : "Changer"}</Text>
          </Pressable>
          {!isLocal && (
            <Pressable style={[s.imgActionBtn, s.imgActionBtnRed]} onPress={onRemove}>
              <Ionicons name="close" size={13} color="#ef4444" />
              <Text style={[s.imgActionText, { color: "#ef4444" }]}>Retirer</Text>
            </Pressable>
          )}
        </View>
      )}
      {isLocal && (
        <Text style={s.imgLocalNote}>Image locale</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f8f8" },
  topBar: { backgroundColor: "white", paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  back: { flexDirection: "row", alignItems: "center", gap: 4, width: 60 },
  backText: { color: "#6366f1", fontWeight: "600" },
  title: { flex: 1, fontSize: 17, fontWeight: "700", textAlign: "center" },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { color: "#9ca3af", fontSize: 14 },

  card: { backgroundColor: "white", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  cardImages: { flexDirection: "column", gap: 4 },
  cardThumb: { width: 40, height: 40, borderRadius: 8 },
  cardThumbEmpty: { backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardLabel: { fontSize: 15, fontWeight: "700", color: "#111827" },
  cardKey: { fontSize: 11, color: "#9ca3af", backgroundColor: "#f3f4f6", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cardDesc: { fontSize: 13, color: "#6b7280" },
  cardActions: { flexDirection: "row", gap: 14 },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "white", padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 14, paddingBottom: 48 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
  fieldHint: { fontSize: 11, color: "#9ca3af", fontStyle: "italic" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 14, color: "#111827" },
  inputDisabled: { backgroundColor: "#f9fafb", color: "#9ca3af" },

  imagesRow: { flexDirection: "row", gap: 12 },
  imgSlot: { flex: 1, gap: 8 },
  imgSlotLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600", textAlign: "center" },
  imgBox: { height: 110, borderRadius: 14, borderWidth: 1.5, borderColor: "#e5e7eb", borderStyle: "dashed", overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" },
  imgPreview: { width: "100%", height: "100%" },
  imgPlaceholder: { alignItems: "center", gap: 4 },
  imgPlaceholderText: { fontSize: 12, color: "#9ca3af" },
  imgActions: { flexDirection: "row", gap: 6 },
  imgActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6, borderRadius: 8, backgroundColor: "#eef2ff" },
  imgActionBtnRed: { backgroundColor: "#fef2f2" },
  imgActionText: { fontSize: 12, fontWeight: "600", color: "#6366f1" },
  imgLocalNote: { fontSize: 11, color: "#9ca3af", textAlign: "center", fontStyle: "italic" },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: "center" },
  ghost: { backgroundColor: "#f3f4f6" },
  ghostText: { color: "#555", fontWeight: "600" },
  primary: { backgroundColor: "#6366f1" },
  primaryText: { color: "white", fontWeight: "700" },
});
