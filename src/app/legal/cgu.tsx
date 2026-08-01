import { useTheme, type Theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function CGU() {
  const t = useTheme();
  const s = makeStyles(t);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>
        <Text style={s.title}>CGU</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.date}>Dernière mise à jour : juin 2026</Text>

        <Section title="1. Objet" t={t}>
          Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application mobile TsuyaApp, éditée dans le cadre d'un projet pédagogique Ynov Campus.
        </Section>

        <Section title="2. Accès à l'application" t={t}>
          L'application est accessible gratuitement à toute personne disposant d'un appareil compatible (iOS ou Android) et d'une connexion internet. L'utilisateur doit créer un compte pour accéder aux fonctionnalités.
        </Section>

        <Section title="3. Compte utilisateur" t={t}>
          L'utilisateur s'engage à fournir des informations exactes lors de l'inscription et à maintenir la confidentialité de ses identifiants. Tout accès via son compte est réputé effectué par l'utilisateur.
        </Section>

        <Section title="4. Utilisation acceptable" t={t}>
          L'utilisateur s'engage à ne pas utiliser l'application à des fins illicites, à ne pas perturber le fonctionnement du service et à respecter les autres utilisateurs lors des interactions (challenges, classements).
        </Section>

        <Section title="5. Propriété intellectuelle" t={t}>
          L'ensemble des éléments de l'application (logo, illustrations, code source) sont la propriété de l'équipe projet. Toute reproduction sans autorisation est interdite.
        </Section>

        <Section title="6. Limitation de responsabilité" t={t}>
          TsuyaApp est un projet étudiant fourni « en l'état ». Aucune garantie de disponibilité continue ou d'absence de bugs n'est offerte. L'équipe ne saurait être tenue responsable des pertes de données ou interruptions de service.
        </Section>

        <Section title="7. Modification des CGU" t={t}>
          Les présentes CGU peuvent être modifiées à tout moment. L'utilisateur sera informé par notification. La poursuite de l'utilisation de l'application vaut acceptation des nouvelles CGU.
        </Section>

        <Section title="8. Contact" t={t}>
          Pour toute question relative aux présentes CGU, vous pouvez contacter l'équipe via l'adresse indiquée dans les Mentions Légales.
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
