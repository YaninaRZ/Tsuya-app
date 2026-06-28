import { useCallback, useEffect, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "expo-router";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const STAR_SIZE = 110; // Identique à Heatmap (CELL + 76)

type LogRow = { completed_on: string; habits: { title: string } | null };

export default function MonthCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [titles, setTitles] = useState<Record<string, string[]>>({});
  const [detailDate, setDetailDate] = useState<string | null>(null);

  const fetchMonth = useCallback(async () => {
    const mm = String(month + 1).padStart(2, "0");
    const lastDay = new Date(year, month + 1, 0).getDate();
    const { data } = await supabase
      .from("habit_logs")
      .select("completed_on, habits(title)")
      .gte("completed_on", `${year}-${mm}-01`)
      .lte("completed_on", `${year}-${mm}-${String(lastDay).padStart(2, "0")}`);
    const c: Record<string, number> = {};
    const t: Record<string, string[]> = {};
    (data as LogRow[] ?? []).forEach((r) => {
      c[r.completed_on] = (c[r.completed_on] ?? 0) + 1;
      if (!t[r.completed_on]) t[r.completed_on] = [];
      t[r.completed_on].push(r.habits?.title ?? "Habitude supprimée");
    });
    setCounts(c);
    setTitles(t);
  }, [year, month]);

  // Refresh quand l'onglet Profil reprend le focus — même pattern que Heatmap
  useFocusEffect(useCallback(() => { fetchMonth(); }, [fetchMonth]));
  // Refresh quand on navigue entre les mois
  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const detailTitles = detailDate ? (titles[detailDate] ?? []) : [];

  return (
    <View style={s.wrap}>
      {/* Navigation mois */}
      <View style={s.nav}>
        <Pressable onPress={prevMonth} style={s.navBtn} hitSlop={8}>
          <Text style={s.navArrow}>‹</Text>
        </Pressable>
        <Text style={s.title}>{MONTH_NAMES[month]} {year}</Text>
        <Pressable onPress={nextMonth} style={s.navBtn} hitSlop={8}>
          <Text style={s.navArrow}>›</Text>
        </Pressable>
      </View>

      {/* En-têtes jours */}
      <View style={s.labelsRow}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={s.dayLabel}>{d}</Text>
        ))}
      </View>

      {/* Grille */}
      {Array.from({ length: cells.length / 7 }).map((_, ri) => (
        <View key={ri} style={s.weekRow}>
          {cells.slice(ri * 7, ri * 7 + 7).map((day, ci) => {
            if (day === null) return <View key={ci} style={s.cell} />;
            const mm = String(month + 1).padStart(2, "0");
            const dd = String(day).padStart(2, "0");
            const dateStr = `${year}-${mm}-${dd}`;
            const count = counts[dateStr] ?? 0;
            const done = count > 0;
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            return (
              <Pressable
                key={ci}
                style={s.cell}
                onPress={() => setDetailDate(dateStr)}
              >
                {done && (
                  <Image
                    source={require("../../assets/images/star.png")}
                    style={s.starBg}
                    resizeMode="contain"
                  />
                )}
                <Text style={[
                  s.dayNum,
                  done && s.dayDone,
                  isFuture && s.dayFuture,
                  isToday && s.dayToday,
                ]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      {/* Modal détail jour — centrée à l'écran */}
      <Modal
        visible={detailDate !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setDetailDate(null)}
      >
        <Pressable style={ds.overlay} onPress={() => setDetailDate(null)}>
          <View style={ds.card} onStartShouldSetResponder={() => true}>
            <Text style={ds.dateTitle}>
              {detailDate?.split("-").reverse().join("/")}
            </Text>
            <Text style={ds.countLine}>
              {detailTitles.length} habitude{detailTitles.length !== 1 ? "s" : ""} validée{detailTitles.length !== 1 ? "s" : ""}
            </Text>
            {detailTitles.length === 0
              ? <Text style={ds.empty}>Aucune habitude ce jour-là.</Text>
              : detailTitles.map((title, i) => (
                  <View key={i} style={ds.item}>
                    <Image
                      source={require("../../assets/images/star.png")}
                      style={ds.starIcon}
                      resizeMode="contain"
                    />
                    <Text style={ds.habitTitle}>{title}</Text>
                  </View>
                ))
            }
            <Pressable style={ds.closeBtn} onPress={() => setDetailDate(null)}>
              <Text style={ds.closeBtnText}>Fermer</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  // Même structure que Heatmap.tsx
  wrap: { width: "100%", gap: 4, marginVertical: 16 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 16, fontWeight: "700" },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  navArrow: { color: "#3b82f6", fontSize: 20, fontWeight: "700", lineHeight: 22 },
  labelsRow: { flexDirection: "row", marginBottom: 2 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: "#94a3b8" },
  weekRow: { flexDirection: "row" },
  cell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  // Couleurs identiques à Heatmap.tsx
  starBg: { position: "absolute", width: STAR_SIZE, height: STAR_SIZE, opacity: 0.85 },
  dayNum: { position: "absolute", fontSize: 11, fontWeight: "700", color: "#94a3b8" },
  dayDone: { color: "#1e3a5f", fontWeight: "900", fontSize: 13 },
  dayFuture: { color: "#d1d5db" },
  dayToday: { color: "#3b82f6", fontWeight: "900" },
});

const ds = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)", padding: 24 },
  card: { backgroundColor: "white", borderRadius: 24, padding: 24, gap: 12, width: "100%" },
  dateTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  countLine: { fontSize: 14, color: "#64748b", fontWeight: "500" },
  empty: { fontSize: 14, color: "#94a3b8", fontStyle: "italic", paddingVertical: 8 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  starIcon: { width: 28, height: 28 },
  habitTitle: { fontSize: 15, color: "#1e293b", fontWeight: "600", flex: 1 },
  closeBtn: { backgroundColor: "#0f172a", borderRadius: 28, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  closeBtnText: { color: "white", fontSize: 16, fontWeight: "800" },
});
