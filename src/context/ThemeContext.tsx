import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeType = "dark" | "light";

interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  border: string;
}

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  isDark: boolean;
}

const DARK_COLORS: ThemeColors = {
  background: "#121212",
  surface: "#1E1E1E",
  text: "#FFFFFF",
  textSecondary: "#B3B3B3",
  accent: "#1DB954",
  border: "#282828",
};

const LIGHT_COLORS: ThemeColors = {
  background: "#FFFFFF",
  surface: "#F5F5F5",
  text: "#000000",
  textSecondary: "#666666",
  accent: "#1DB954",
  border: "#E0E0E0",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeType>("dark");
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("appTheme");
        if (savedTheme === "light" || savedTheme === "dark") {
          setTheme(savedTheme);
        }
      } catch (error) {
        if (__DEV__) console.error("Failed to load theme:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newTheme = theme === "dark" ? "light" : "dark";
      setTheme(newTheme);
      await AsyncStorage.setItem("appTheme", newTheme);
    } catch (error) {
      if (__DEV__) console.error("Failed to save theme:", error);
    }
  };

  const colors = theme === "dark" ? DARK_COLORS : LIGHT_COLORS;
  const isDark = theme === "dark";

  if (isLoading) {
    return null; // Or return a loading screen
  }

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
