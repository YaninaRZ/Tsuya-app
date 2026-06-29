import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

type ThemeMode = "light" | "dark" | "system";
const STORAGE_KEY = "tsuya_theme_mode";

type ThemeCtxType = { isDark: boolean; toggle: () => void };
const ThemeCtx = createContext<ThemeCtxType>({ isDark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark") setMode(v);
    });
  }, []);

  const isDark = mode === "system" ? system === "dark" : mode === "dark";

  const toggle = useCallback(() => {
    const next: ThemeMode = isDark ? "light" : "dark";
    setMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, [isDark]);

  return <ThemeCtx.Provider value={{ isDark, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useThemeMode() {
  return useContext(ThemeCtx);
}
