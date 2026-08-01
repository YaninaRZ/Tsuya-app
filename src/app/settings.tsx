import { supabase } from "@/lib/supabase";
import { getNotifPrefs, saveNotifPrefs, type NotifPrefs } from "@/lib/notifications";
import { useTheme, type Theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

export default function Settings() {
  const t = useTheme();
  const s = makeStyles(t);
  const [prefs, setPrefs] = useState<NotifPrefs>({ morning: true, evening: true, levelUp: true, streak: true });
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    getNotifPrefs().then(setPrefs);
  }, []);

  async function togglePref(key: keyof NotifPrefs) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await saveNotifPrefs(updated);
  }

  function confirmSignOut() {
    Alert.alert("Se déconnecter ?", "Tu devras te reconnecter pour accéder à ton compte.", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Supprimer ton compte ?",
      "Cette action est irréversible. Toutes tes données (habitudes, badges, XP) seront définitivement supprimées.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer", style: "destructive", onPress: async () => {
            Alert.alert(
              "Dernière confirmation",
              "Es-tu vraiment sûr(e) ? Il n'y a pas de retour en arrière.",
              [
                { text: "Annuler", style: "cancel" },
                { text: "Oui, supprimer", style: "destructive", onPress: deleteAccount },
              ],
            );
          },
        },
      ],
    );
  }

  async function deleteAccount() {
    setDeletingAccount(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeletingAccount(false); return; }

    const { error } = await supabase.functions.invoke("delete-account", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    setDeletingAccount(false);
    if (error) {
      Alert.alert("Erreur", "Impossible de supprimer le compte. Réessaie plus tard.");
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.push("/(tabs)/profil" as any)}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>
        <Text style={s.title}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Notifications */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Notifications</Text>
          <View style={s.card}>
            <NotifRow
              icon="sunny-outline"
              label="Rappel du matin"
              sub="Tous les jours à 9h00"
              value={prefs.morning}
              onToggle={() => togglePref("morning")}
              t={t} s={s}
            />
            <NotifRow
              icon="moon-outline"
              label="Rappel du soir"
              sub="Tous les jours à 20h00"
              value={prefs.evening}
              onToggle={() => togglePref("evening")}
              t={t} s={s}
              border
            />
            <NotifRow
              icon="trending-up-outline"
              label="Montée de niveau"
              sub="Quand tu passes au niveau suivant"
              value={prefs.levelUp}
              onToggle={() => togglePref("levelUp")}
              t={t} s={s}
              border
            />
            <NotifRow
              icon="flame-outline"
              label="Jalons de série"
              sub="3, 7, 14, 30 jours consécutifs"
              value={prefs.streak}
              onToggle={() => togglePref("streak")}
              t={t} s={s}
              border
              last
            />
          </View>
        </View>

        {/* Légal */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Légal</Text>
          <View style={s.card}>
            <LinkRow icon="document-text-outline" label="Conditions générales d'utilisation" onPress={() => router.push("/legal/cgu" as any)} t={t} s={s} />
            <LinkRow icon="shield-checkmark-outline" label="Politique de confidentialité" onPress={() => router.push("/legal/confidentialite" as any)} t={t} s={s} border />
            <LinkRow icon="information-circle-outline" label="Mentions légales" onPress={() => router.push("/legal/mentions" as any)} t={t} s={s} border last />
          </View>
        </View>

        {/* Session */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Session</Text>
          <View style={s.card}>
            <LinkRow icon="log-out-outline" label="Se déconnecter" onPress={confirmSignOut} t={t} s={s} danger last />
          </View>
        </View>

        {/* Danger zone */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Zone de danger</Text>
          <View style={[s.card, s.dangerCard]}>
            <Pressable style={s.deleteRow} onPress={confirmDeleteAccount} disabled={deletingAccount}>
              <View style={s.deleteIcon}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.deleteLabel}>Supprimer mon compte</Text>
                <Text style={s.deleteSub}>Action irréversible — toutes tes données seront perdues</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ef4444" />
            </Pressable>
          </View>
        </View>

        <Text style={s.version}>TsuyaApp · v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function NotifRow({ icon, label, sub, value, onToggle, t, s, border, last }: {
  icon: string; label: string; sub: string; value: boolean;
  onToggle: () => void; t: ReturnType<typeof useTheme>; s: any;
  border?: boolean; last?: boolean;
}) {
  return (
    <View style={[s.row, border && s.rowBorder, last && { paddingBottom: 14 }]}>
      <View style={s.rowIcon}>
        <Ionicons name={icon as any} size={18} color={t.purple} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: t.borderLight, true: t.purple }}
        thumbColor="white"
      />
    </View>
  );
}

function LinkRow({ icon, label, onPress, t, s, border, last, danger }: {
  icon: string; label: string; onPress: () => void;
  t: ReturnType<typeof useTheme>; s: any;
  border?: boolean; last?: boolean; danger?: boolean;
}) {
  return (
    <Pressable style={[s.row, border && s.rowBorder, last && { paddingBottom: 14 }]} onPress={onPress}>
      <View style={[s.rowIcon, danger && s.rowIconDanger]}>
        <Ionicons name={icon as any} size={18} color={danger ? "#ef4444" : t.purple} />
      </View>
      <Text style={[s.rowLabel, danger && s.rowLabelDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
    </Pressable>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background, paddingTop: 60 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.navBtn, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 20, fontWeight: "800", color: t.text },
    content: { padding: 20, gap: 24, paddingBottom: 60 },
    section: { gap: 8 },
    sectionTitle: { fontSize: 12, fontWeight: "700", color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 4 },
    card: { backgroundColor: t.card, borderRadius: 16, borderWidth: 1, borderColor: t.border, overflow: "hidden" },
    dangerCard: { borderColor: "#fecaca" },
    row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
    rowBorder: { borderTopWidth: 1, borderTopColor: t.borderLight },
    rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: t.blueLight, alignItems: "center", justifyContent: "center" },
    rowIconDanger: { backgroundColor: "#fef2f2" },
    rowLabel: { flex: 1, fontSize: 15, color: t.text, fontWeight: "500" },
    rowLabelDanger: { color: "#ef4444" },
    rowSub: { fontSize: 12, color: t.textMuted },
    deleteRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 16 },
    deleteIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" },
    deleteLabel: { fontSize: 15, fontWeight: "600", color: "#ef4444" },
    deleteSub: { fontSize: 12, color: "#f87171", marginTop: 2 },
    version: { textAlign: "center", color: t.textMuted, fontSize: 12, marginTop: 4 },
  });
}
