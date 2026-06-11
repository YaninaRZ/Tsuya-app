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
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Banner = { id: string; name: string; url: string };

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => { fetchBanners(); }, []);

  async function fetchBanners() {
    const { data } = await supabase.from("profile_banners").select("id, name, url").order("created_at");
    setBanners(data ?? []);
    setLoading(false);
  }

  async function pickAndUpload() {
    if (!name.trim()) { Alert.alert("Nom requis", "Donne un nom à ce banner."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 1],
    });
    if (result.canceled) return;

    setUploading(true);
    const asset = result.assets[0];
    const ext = asset.uri.split(".").pop() ?? "jpg";
    const path = `predefined/${Date.now()}.${ext}`;

    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const { error: uploadErr } = await supabase.storage.from("banners").upload(path, blob, { contentType: `image/${ext}` });
    if (uploadErr) { Alert.alert("Erreur upload", uploadErr.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(path);
    const { error } = await supabase.from("profile_banners").insert({ name: name.trim(), url: publicUrl });
    setUploading(false);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setName("");
    fetchBanners();
  }

  async function deleteBanner(banner: Banner) {
    await supabase.from("profile_banners").delete().eq("id", banner.id);
    setBanners((prev) => prev.filter((b) => b.id !== banner.id));
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color="#6366f1" />
        </Pressable>
        <Text style={s.title}>Banners prédéfinis</Text>
      </View>

      <View style={s.addRow}>
        <TextInput style={s.input} placeholder="Nom du banner (ex: Forêt bleue)" value={name} onChangeText={setName} />
        <Pressable style={[s.uploadBtn, uploading && { opacity: 0.6 }]} onPress={pickAndUpload} disabled={uploading}>
          {uploading ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="cloud-upload-outline" size={20} color="white" />}
        </Pressable>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
        <FlatList
          data={banners}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={s.empty}>Aucun banner — ajoutes-en un !</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Image source={{ uri: item.url }} style={s.preview} resizeMode="cover" />
              <View style={s.cardInfo}>
                <Text style={s.cardName}>{item.name}</Text>
              </View>
              <Pressable onPress={() => Alert.alert("Supprimer ?", `Supprimer « ${item.name} » ?`, [
                { text: "Annuler", style: "cancel" },
                { text: "Supprimer", style: "destructive", onPress: () => deleteBanner(item) },
              ])}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  back: { padding: 4 },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  addRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  input: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 14 },
  uploadBtn: { backgroundColor: "#6366f1", borderRadius: 10, width: 48, alignItems: "center", justifyContent: "center" },
  empty: { color: "#9ca3af", textAlign: "center", marginTop: 40, fontSize: 14 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f9fafb", borderRadius: 14, overflow: "hidden" },
  preview: { width: 100, height: 50 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: "600", color: "#111827" },
});
