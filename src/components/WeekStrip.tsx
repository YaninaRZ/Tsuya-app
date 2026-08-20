import { useTheme } from "@/lib/theme";
import { useMemo, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const DAYS_BACK = 60;
const DAYS_FORWARD = 14;
const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];
const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
const DAY_W = 44;
const GAP = 10;
const ITEM_W = DAY_W + GAP;

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDays() {
  const today = new Date();
  const arr: Date[] = [];
  for (let i = DAYS_BACK; i >= -DAYS_FORWARD; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    arr.push(d);
  }
  return arr;
}

function monthLabel(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function WeekStrip({
  selectedDate,
  onSelect,
}: {
  selectedDate: string;
  onSelect: (key: string) => void;
}) {
  const colors = useTheme();
  const s = useMemo(() => StyleSheet.create({
    wrap: { marginBottom: 16 },
    month: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8, textTransform: "capitalize" },
    row: { gap: GAP, paddingVertical: 4 },
    day: { alignItems: "center", gap: 6, width: DAY_W },
    label: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
    circle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    circleToday: { borderWidth: 2, borderColor: colors.blue },
    circleSelected: { backgroundColor: colors.blue },
    dateText: { fontSize: 15, color: colors.text, fontWeight: "600" },
    dateTextSelected: { color: "white", fontWeight: "700" },
  }), [colors]);

  const days = useMemo(buildDays, []);
  const todayKey = toKey(new Date());
  const ref = useRef<ScrollView>(null);
  const [header, setHeader] = useState(() => monthLabel(new Date()));

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.min(days.length - 1, Math.max(0, Math.round(x / ITEM_W)));
    setHeader(monthLabel(days[idx]));
  }

  return (
    <View style={s.wrap}>
      <Text style={s.month}>{header}</Text>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onContentSizeChange={() =>
          ref.current?.scrollToEnd({ animated: false })
        }
        contentContainerStyle={s.row}
      >
        {days.map((d) => {
          const key = toKey(d);
          const selected = key === selectedDate;
          const isToday = key === todayKey;
          const dayName = [
            "Dimanche",
            "Lundi",
            "Mardi",
            "Mercredi",
            "Jeudi",
            "Vendredi",
            "Samedi",
          ][d.getDay()];
          const monthName = MONTHS[d.getMonth()];
          return (
            <Pressable
              key={key}
              style={s.day}
              onPress={() => onSelect(key)}
              accessibilityRole="button"
              accessibilityLabel={`${dayName} ${d.getDate()} ${monthName}${isToday ? ", aujourd'hui" : ""}${selected ? ", sélectionné" : ""}`}
              accessibilityState={{ selected }}
            >
              <Text style={s.label}>{WEEKDAYS[d.getDay()]}</Text>
              <View
                style={[
                  s.circle,
                  isToday && !selected && s.circleToday,
                  selected && s.circleSelected,
                ]}
              >
                <Text style={[s.dateText, selected && s.dateTextSelected]}>
                  {d.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

