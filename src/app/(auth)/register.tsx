import { supabase } from "@/lib/supabase";
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

export default function Register() {
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { pseudo } }, // ← repris par ton trigger handle_new_user
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
        value={pseudo}
        onChangeText={setPseudo}
      />
      <TextInput
        style={s.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={s.input}
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={s.button} onPress={signUp} disabled={loading}>
        <Text style={s.buttonText}>{loading ? "..." : "Créer mon compte"}</Text>
      </Pressable>
      <Link href="/login" style={s.link}>
        Déjà un compte ? Se connecter
      </Link>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 14 },
  button: {
    backgroundColor: "#6366f1",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "600" },
  link: { textAlign: "center", color: "#6366f1", marginTop: 8 },
});
