import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useTheme, type Theme } from "@/lib/theme";
import { useEffect, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getWeekDates(): Date[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
}

function dKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeStreak(dates: Set<string>) {
  const dayMs = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let cursor = new Date(today);
  if (!dates.has(dKey(cursor))) {
    cursor = new Date(today.getTime() - dayMs);
    if (!dates.has(dKey(cursor))) return 0;
  }
  let streak = 0;
  while (dates.has(dKey(cursor))) { streak++; cursor = new Date(cursor.getTime() - dayMs); }
  return streak;
}

function motivationalMessage(streak: number): string {
  if (streak === 0) return "Lance ta première série aujourd'hui !";
  if (streak === 1) return "C'est parti ! Un jour à la fois.";
  if (streak < 5) return "Belle lancée ! Continue comme ça.";
  if (streak < 10) return "Tu es en feu ! Rien ne t'arrête.";
  if (streak < 20) return "Incroyable régularité ! Tu es au top.";
  if (streak < 30) return "Légendaire ! Quelle discipline.";
  return "Tu es une machine ! Respect absolu.";
}

function mascotMessage(streak: number): string {
  if (streak === 0) return "Allez, commence aujourd'hui ! Je crois en toi 😊";
  if (streak < 5) return "Super boulot ! Continue comme ça 😸";
  if (streak < 10) return "Tu cartones vraiment ! Garde ce rythme 🔥";
  return "Waow, tu es absolument incroyable ! 🤩";
}

function BlueFlame({ size = 110 }: { size?: number }) {
  const w = size * 0.72;
  const h = size;
  return (
    <Svg width={w} height={h} viewBox="0 0 72 100">
      <Defs>
        <LinearGradient id="outerGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0%" stopColor="#bfdbfe" />
          <Stop offset="50%" stopColor="#60a5fa" />
          <Stop offset="100%" stopColor="#3b82f6" />
        </LinearGradient>
        <LinearGradient id="innerGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0%" stopColor="#eff6ff" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.7" />
        </LinearGradient>
      </Defs>
      <Path
        d="M 36 98
           C 18 92, 6 76, 8 58
           C 9 46, 16 38, 14 26
           C 12 16, 18 8, 26 10
           C 24 4, 30 0, 36 2
           C 42 0, 48 4, 46 10
           C 56 6, 62 16, 58 28
           C 55 38, 62 48, 63 58
           C 65 76, 54 92, 36 98 Z"
        fill="url(#outerGrad)"
      />
      <Path
        d="M 36 88
           C 24 82, 18 70, 20 56
           C 21 48, 26 42, 25 34
           C 28 38, 30 44, 36 46
           C 42 44, 44 38, 47 34
           C 46 42, 51 48, 52 56
           C 54 70, 48 82, 36 88 Z"
        fill="url(#innerGrad)"
      />
    </Svg>
  );
}

type Props = { visible: boolean; onClose: () => void };

export default function StreakModal({ visible, onClose }: Props) {
  const t = useTheme();
  const s = makeStyles(t);
  const { session } = useAuth();
  const [logDates, setLogDates] = useState<Set<string>>(new Set());
  const weekDates = getWeekDates();

  useEffect(() => {
    if (!visible || !session) return;
    supabase.from("habit_logs").select("completed_on").then(({ data }) => {
      setLogDates(new Set((data ?? []).map((l) => l.completed_on as string)));
    });
  }, [visible, session]);

  const streak = computeStreak(logDates);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={s.screen}>

        <View style={s.heroSection}>
          <BlueFlame size={120} />
          <Text style={s.streakNumber}>{streak}</Text>
          <Text style={s.message}>{motivationalMessage(streak)}</Text>
        </View>

        <View style={s.weekRow}>
          {weekDates.map((d, i) => {
            const key = dKey(d);
            const done = logDates.has(key);
            const isToday = key === dKey(new Date());
            return (
              <View key={i} style={s.dayCol}>
                <View style={[s.dayCircle, done && s.dayDone, isToday && !done && s.dayToday]}>
                  {done ? <Text style={s.checkmark}>✓</Text> : null}
                </View>
                <Text style={[s.dayLabel, isToday && { color: "#3b82f6", fontWeight: "700" }]}>
                  {DAYS[i]}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={s.mascotRow}>
          <Image
            source={streak > 0
              ? require("../../assets/images/happy-tsuya.png")
              : require("../../assets/images/sad-tsuya.png")}
            style={s.mascotImg}
            resizeMode="contain"
          />
          <View style={s.bubble}>
            <Text style={s.bubbleText}>{mascotMessage(streak)}</Text>
          </View>
        </View>

        <Pressable style={s.backBtn} onPress={onClose}>
          <Text style={s.backBtnText}>Retour</Text>
        </Pressable>

      </View>
    </Modal>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
      paddingHorizontal: 32,
      paddingTop: 90,
      paddingBottom: 52,
      justifyContent: "space-between",
    },

    heroSection: { alignItems: "center", gap: 0 },
    streakNumber: { fontSize: 88, fontWeight: "900", color: t.text, lineHeight: 96, marginTop: -4 },
    message: { fontSize: 15, color: t.textSecondary, fontWeight: "500", textAlign: "center", marginTop: 8, marginBottom: -40 },

    weekRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
    dayCol: { alignItems: "center", gap: 8 },
    dayCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: t.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    dayDone: { backgroundColor: "#60a5fa" },
    dayToday: { borderWidth: 2, borderColor: "#60a5fa", backgroundColor: t.background },
    checkmark: { color: "white", fontSize: 20, fontWeight: "800" },
    dayLabel: { fontSize: 12, color: t.textMuted, fontWeight: "600" },

    mascotRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    mascotImg: { width: 64, height: 64 },
    bubble: {
      flex: 1,
      backgroundColor: t.surfaceAlt,
      borderRadius: 18,
      borderTopLeftRadius: 4,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    bubbleText: { fontSize: 14, color: t.textDark, lineHeight: 21, fontWeight: "500" },

    backBtn: {
      backgroundColor: t.actionBtn,
      borderRadius: 22,
      paddingVertical: 20,
      alignItems: "center",
    },
    backBtnText: { color: t.actionBtnText, fontSize: 17, fontWeight: "700" },
  });
}
