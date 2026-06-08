import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const WEEKS = 16;
const CELL = 13;
const GAP = 3;

function key(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildColumns() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7; // lundi = 0
  const start = new Date(today);
  start.setDate(today.getDate() - dow - (WEEKS - 1) * 7);
  const cols: Date[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      col.push(day);
    }
    cols.push(col);
  }
  return cols;
}

function colorFor(count: number) {
  if (count <= 0) return "#ebedf0";
  if (count === 1) return "#c6e48b";
  if (count <= 3) return "#7bc96f";
  if (count <= 5) return "#239a3b";
  return "#196127";
}

export default function Heatmap() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const todayKey = key(new Date());

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from("habit_logs")
      .select("completed_on");
    if (error || !data) return;
    const c: Record<string, number> = {};
    for (const row of data) {
      const k = row.completed_on as string; // "YYYY-MM-DD"
      c[k] = (c[k] ?? 0) + 1;
    }
    setCounts(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [fetchLogs]),
  );

  const columns = buildColumns();

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Activité</Text>
      <View style={s.grid}>
        {columns.map((col, ci) => (
          <View key={ci} style={{ gap: GAP }}>
            {col.map((d) => {
              const k = key(d);
              const future = k > todayKey;
              return (
                <View
                  key={k}
                  style={[
                    s.cell,
                    {
                      backgroundColor: future
                        ? "transparent"
                        : colorFor(counts[k] ?? 0),
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={s.legend}>
        <Text style={s.legendText}>Moins</Text>
        {[0, 1, 3, 5, 6].map((n, i) => (
          <View key={i} style={[s.cell, { backgroundColor: colorFor(n) }]} />
        ))}
        <Text style={s.legendText}>Plus</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: "100%", gap: 10, marginVertical: 24 },
  title: { fontSize: 16, fontWeight: "700" },
  grid: { flexDirection: "row", gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  legend: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  legendText: { fontSize: 11, color: "#888" },
});
