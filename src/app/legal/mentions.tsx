import { useTheme, type Theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function Mentions() {
  const t = useTheme();
  const s = makeStyles(t);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>
        <Text style={s.title}>Mentions légales</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.card}>
          <Text style={s.cardTitle}>Éditeur</Text>
          <Row label="Nom" value="TsuyaApp" t={t} />
          <Row label="Nature" value="Projet pédagogique — Ynov Campus" t={t} />
          <Row label="Promotion" value="Bachelor Informatique — RNCP 36463" t={t} />
          <Row label="Auteure" value="Yanina Razvetskaya" t={t} />
          <Row label="Contact" value="yaninarazvetskaya@gmail.com" t={t} last />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Hébergement</Text>
          <Row label="Plateforme" value="Supabase Inc." t={t} />
          <Row label="Région" value="Union Européenne (eu-west-1)" t={t} />
          <Row label="Site" value="supabase.com" t={t} last />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Technologies</Text>
          <Row label="Framework" value="React Native / Expo SDK 56" t={t} />
          <Row label="Backend" value="Supabase (PostgreSQL + Storage)" t={t} />
          <Row label="Authentification" value="Supabase Auth (JWT)" t={t} last />
        </View>

        <Text style={s.footer}>
          TsuyaApp est un projet réalisé dans le cadre du cursus Ynov Campus. Il n'a pas vocation commerciale.
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, t, last }: { label: string; value: string; t: ReturnType<typeof useTheme>; last?: boolean }) {
  return (
    <View style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 }, !last && { borderBottomWidth: 1, borderBottomColor: t.borderLight }]}>
      <Text style={{ fontSize: 14, color: t.textMuted, fontWeight: "500" }}>{label}</Text>
      <Text style={{ fontSize: 14, color: t.text, fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 12 }}>{value}</Text>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background, paddingTop: 60 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.navBtn, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 20, fontWeight: "800", color: t.text },
    content: { padding: 20, gap: 16, paddingBottom: 60 },
    card: { backgroundColor: t.card, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 16, gap: 0 },
    cardTitle: { fontSize: 13, fontWeight: "700", color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
    footer: { fontSize: 13, color: t.textMuted, textAlign: "center", lineHeight: 20, fontStyle: "italic" },
  });
}
