import { supabase } from "@/lib/supabase";
import { useTheme, type Theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type StrengthLevel = { label: string; color: string; score: number };

function getStrength(pwd: string): StrengthLevel {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;

  if (score <= 1) return { label: "Faible", color: "#ef4444", score };
  if (score === 2) return { label: "Moyen", color: "#f97316", score };
  if (score === 3) return { label: "Fort", color: "#eab308", score };
  return { label: "Très fort", color: "#22c55e", score };
}

export default function Register() {
  const t = useTheme();
  const s = makeStyles(t);
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = password.length > 0 ? getStrength(password) : null;

  async function signUp() {
    if (password.length < 8) {
      Alert.alert("Mot de passe trop court", "Il faut au moins 8 caractères.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { pseudo } },
    });
    setLoading(false);
    if (error) Alert.alert("Erreur", error.message);
    else Alert.alert("Compte créé ✅", "Tu peux te connecter !");
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Inscription</Text>

      <TextInput
        style={s.input}
        placeholder="Pseudo"
        placeholderTextColor={t.placeholder}
        value={pseudo}
        onChangeText={setPseudo}
      />
      <TextInput
        style={s.input}
        placeholder="Email"
        placeholderTextColor={t.placeholder}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {/* Champ mot de passe avec œil */}
      <View style={s.pwdRow}>
        <TextInput
          style={s.pwdInput}
          placeholder="Mot de passe"
          placeholderTextColor={t.placeholder}
          secureTextEntry={!showPwd}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />
        <Pressable style={s.eyeBtn} onPress={() => setShowPwd((v) => !v)} hitSlop={8}>
          <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={20} color={t.textMuted} />
        </Pressable>
      </View>

      {/* Indicateur de force */}
      {strength && (
        <View style={s.strengthWrap}>
          <View style={s.bars}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  s.bar,
                  { backgroundColor: strength.score >= i ? strength.color : t.border },
                ]}
              />
            ))}
          </View>
          <Text style={[s.strengthLabel, { color: strength.color }]}>
            {strength.label}
          </Text>
        </View>
      )}

      {/* Critères */}
      {password.length > 0 && (
        <View style={s.criteria}>
          <Criterion ok={password.length >= 8} label="8 caractères minimum" t={t} />
          <Criterion ok={/[A-Z]/.test(password)} label="Une majuscule" t={t} />
          <Criterion ok={/[0-9]/.test(password)} label="Un chiffre" t={t} />
          <Criterion ok={/[^a-zA-Z0-9]/.test(password)} label="Un caractère spécial (!@#…)" t={t} />
        </View>
      )}

      <Pressable style={s.button} onPress={signUp} disabled={loading}>
        <Text style={s.buttonText}>{loading ? "..." : "Créer mon compte"}</Text>
      </Pressable>
      <Link href="/login" style={s.link}>
        Déjà un compte ? Se connecter
      </Link>
    </View>
  );
}

function Criterion({ ok, label, t }: { ok: boolean; label: string; t: Theme }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Ionicons
        name={ok ? "checkmark-circle" : "ellipse-outline"}
        size={14}
        color={ok ? "#22c55e" : t.textMuted}
      />
      <Text style={{ fontSize: 12, color: ok ? "#22c55e" : t.textMuted }}>{label}</Text>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: t.background },
    title: { fontSize: 28, fontWeight: "700", marginBottom: 12, color: t.text },
    input: { borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 14, backgroundColor: t.input, color: t.text },
    pwdRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, backgroundColor: t.input },
    pwdInput: { flex: 1, padding: 14, color: t.text },
    eyeBtn: { paddingHorizontal: 14 },
    strengthWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
    bars: { flexDirection: "row", gap: 4, flex: 1 },
    bar: { flex: 1, height: 4, borderRadius: 2 },
    strengthLabel: { fontSize: 12, fontWeight: "700", minWidth: 60, textAlign: "right" },
    criteria: { gap: 4 },
    button: { backgroundColor: "#6366f1", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 4 },
    buttonText: { color: "white", fontWeight: "600" },
    link: { textAlign: "center", color: "#6366f1", marginTop: 8 },
  });
}
