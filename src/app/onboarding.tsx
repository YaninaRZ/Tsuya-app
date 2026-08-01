import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { useTheme } from "@/lib/theme";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    key: "1",
    title: "Bienvenue sur Tsuya",
    subtitle: "Construis de bonnes habitudes,\njour après jour.",
    points: null,
  },
  {
    key: "2",
    title: "Progresse. Défie. Évolue.",
    subtitle: null,
    points: [
      "Crée tes habitudes personnelles et suis ta progression",
      "Garde ta série de jours consécutifs sans la briser",
      "Rejoins des challenges et avance avec d'autres",
    ],
  },
];

export const ONBOARDING_KEY = "tsuya_onboarding_seen";

export default function Onboarding() {
  const t = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    slide: { width, flex: 1, justifyContent: "center", paddingHorizontal: 36 },
    title: {
      fontSize: 32,
      fontWeight: "800",
      color: t.text,
      marginBottom: 20,
      lineHeight: 40,
    },
    subtitle: {
      fontSize: 18,
      color: t.textSecondary,
      lineHeight: 28,
      fontWeight: "400",
    },
    pointRow: {
      flexDirection: "row",
      gap: 14,
      marginBottom: 20,
      alignItems: "flex-start",
    },
    bullet: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.blue,
      marginTop: 8,
    },
    pointText: {
      fontSize: 17,
      color: t.textSecondary,
      lineHeight: 26,
      flex: 1,
      fontWeight: "400",
    },
    bottom: {
      paddingHorizontal: 36,
      paddingBottom: 52,
      gap: 28,
    },
    dots: {
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
    },
    dot: {
      height: 8,
      borderRadius: 4,
      backgroundColor: t.border,
    },
    dotActive: {
      backgroundColor: t.blue,
      width: 24,
    },
    dotInactive: {
      width: 8,
    },
    btn: {
      backgroundColor: t.actionBtn,
      borderRadius: 28,
      paddingVertical: 18,
      alignItems: "center",
    },
    btnText: {
      color: t.actionBtnText,
      fontSize: 16,
      fontWeight: "800",
    },
    skipBtn: { alignItems: "center", paddingVertical: 4 },
    skipText: { color: t.textMuted, fontSize: 14 },
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) setActiveIndex(viewableItems[0].index ?? 0);
    }
  ).current;

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/login");
  }

  function next() {
    if (activeIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      finish();
    }
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={s.container}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={s.slide}>
            <Text style={s.title}>{item.title}</Text>
            {item.subtitle && <Text style={s.subtitle}>{item.subtitle}</Text>}
            {item.points && (
              <View style={{ gap: 4, marginTop: 8 }}>
                {item.points.map((p: string, i: number) => (
                  <View key={i} style={s.pointRow}>
                    <View style={s.bullet} />
                    <Text style={s.pointText}>{p}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      />

      <View style={s.bottom}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[s.dot, i === activeIndex ? s.dotActive : s.dotInactive]}
            />
          ))}
        </View>

        <Pressable style={s.btn} onPress={next}>
          <Text style={s.btnText}>
            {isLast ? "Commencer" : "Suivant"}
          </Text>
        </Pressable>

        {!isLast && (
          <Pressable style={s.skipBtn} onPress={finish}>
            <Text style={s.skipText}>Passer</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
