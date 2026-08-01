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

export default function Login() {
  const t = useTheme();
  const s = makeStyles(t);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert("Erreur", error.message);
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Connexion</Text>
      <TextInput
        style={s.input}
        placeholder="Email"
        placeholderTextColor={t.placeholder}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
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
      <Pressable style={s.button} onPress={signIn} disabled={loading}>
        <Text style={s.buttonText}>{loading ? "..." : "Se connecter"}</Text>
      </Pressable>
      <Link href="/register" style={s.link}>
        Pas de compte ? S'inscrire
      </Link>
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
    button: { backgroundColor: "#6366f1", padding: 16, borderRadius: 10, alignItems: "center" },
    buttonText: { color: "white", fontWeight: "600" },
    link: { textAlign: "center", color: "#6366f1", marginTop: 8 },
  });
}
