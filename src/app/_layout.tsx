import { AuthProvider, useAuth } from "@/context/AuthContext";
import { HabitsProvider } from "@/context/HabitsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { setupNotifications } from "@/lib/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ONBOARDING_KEY } from "./onboarding";

function RootNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      const seen = !!val;
      const inAuthGroup = segments[0] === "(auth)";
      const inOnboarding = segments[0] === "onboarding";

      if (!seen && !inOnboarding) {
        router.replace("/onboarding");
      } else if (!session && !inAuthGroup && !inOnboarding) {
        router.replace("/login");
      } else if (session && (inAuthGroup || inOnboarding)) {
        router.replace("/");
      }

      if (session) setupNotifications();
      setReady(true);
    });
  }, [session, loading, segments]);

  if (loading || !ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <HabitsProvider>
            <RootNavigation />
          </HabitsProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
