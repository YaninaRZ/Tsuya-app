import { useTheme, type Theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function Confidentialite() {
  const t = useTheme();
  const s = makeStyles(t);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>
        <Text style={s.title}>Confidentialité</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.date}>Dernière mise à jour : juin 2026</Text>

        <Section title="1. Données collectées" t={t}>
          TsuyaApp collecte les données suivantes lors de l'inscription et de l'utilisation : adresse e-mail, pseudo, photo de profil (optionnelle), habitudes et statistiques d'activité.
        </Section>

        <Section title="2. Finalité du traitement" t={t}>
          Les données sont utilisées pour : créer et gérer votre compte, afficher vos statistiques personnelles, vous permettre de rejoindre des challenges et d'interagir avec d'autres utilisateurs.
        </Section>

        <Section title="3. Hébergement des données" t={t}>
          Les données sont hébergées sur les serveurs de Supabase (Union Européenne). Aucune donnée n'est vendue à des tiers.
        </Section>

        <Section title="4. Durée de conservation" t={t}>
          Les données sont conservées pendant toute la durée d'existence de votre compte. À la suppression du compte, les données personnelles sont effacées dans un délai de 30 jours.
        </Section>

        <Section title="5. Vos droits" t={t}>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits, contactez-nous via les Mentions Légales.
        </Section>

        <Section title="6. Cookies et traceurs" t={t}>
          L'application n'utilise pas de cookies publicitaires. Des données techniques (tokens d'authentification) sont stockées localement sur votre appareil pour maintenir votre session.
        </Section>

        <Section title="7. Modifications" t={t}>
          Cette politique peut évoluer. Toute modification significative vous sera notifiée dans l'application.
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children, t }: { title: string; children: string; t: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: t.text }}>{title}</Text>
      <Text style={{ fontSize: 14, color: t.textSecondary, lineHeight: 22 }}>{children}</Text>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background, paddingTop: 60 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.navBtn, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 20, fontWeight: "800", color: t.text },
    content: { padding: 20, gap: 20, paddingBottom: 60 },
    date: { fontSize: 12, color: t.textMuted, fontStyle: "italic" },
  });
}
