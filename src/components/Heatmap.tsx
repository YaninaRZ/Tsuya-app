import { supabase } from "@/lib/supabase";
import { useTheme, type Theme } from "@/lib/theme";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

const WEEKS = 9;
const CELL = 34;
const GAP = 3;

function key(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildColumns() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7;
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

export default function Heatmap({ hideTitle = false }: { hideTitle?: boolean }) {
  const t = useTheme();
  const s = makeStyles(t);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const todayKey = key(new Date());

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase.from("habit_logs").select("completed_on");
    if (error || !data) return;
    const c: Record<string, number> = {};
    for (const row of data) {
      const k = row.completed_on as string;
      c[k] = (c[k] ?? 0) + 1;
    }
    setCounts(c);
  }, []);

  useFocusEffect(useCallback(() => { fetchLogs(); }, [fetchLogs]));

  const columns = buildColumns();

  return (
    <View style={s.wrap}>
      {!hideTitle && <Text style={s.title}>Activité</Text>}
      <View style={s.grid}>
        {columns.map((col, ci) => (
          <View key={ci} style={{ gap: GAP }}>
            {col.map((d) => {
              const k = key(d);
              const future = k > todayKey;
              const isToday = k === todayKey;
              const count = counts[k] ?? 0;
              const done = !future && count > 0;

              return (
                <View
                  key={k}
                  style={[s.cell, isToday && s.cellToday]}
                  accessible={true}
                  accessibilityLabel={
                    future
                      ? `${d.getDate()} — jour futur`
                      : done
                      ? `${d.getDate()} — habitude complétée`
                      : isToday
                      ? `${d.getDate()} — aujourd'hui`
                      : `${d.getDate()} — pas d'activité`
                  }
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
                    future && s.dayFuture,
                    done && s.dayDone,
                    isToday && s.dayToday,
                  ]}>
                    {d.getDate()}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { width: "100%", gap: 10, marginVertical: 16 },
    title: { fontSize: 16, fontWeight: "700", color: t.text },
    grid: { flexDirection: "row", gap: GAP },
    cell: {
      width: CELL,
      height: CELL,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 6,
    },
    cellToday: {
      borderWidth: 2,
      borderColor: "#3b82f6",
    },
    starBg: {
      position: "absolute",
      width: CELL + 76,
      height: CELL + 76,
      opacity: 0.85,
    },
    dayNum: {
      position: "absolute",
      fontSize: 11,
      fontWeight: "700",
      color: "#94a3b8",
    },
    dayDone: {
      color: t.blueDark,
      fontWeight: "900",
      fontSize: 13,
    },
    dayFuture: {
      color: t.textMuted,
    },
    dayToday: {
      color: "#3b82f6",
      fontWeight: "900",
    },
  });
}
