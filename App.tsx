import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import LoginScreen from "./src/screens/LoginScreen";
import AppNavigator from "./src/navigation/AppNavigator";
import SplashScreen from "./src/components/SplashScreen";
import { SpotifyAuthProvider } from "./src/context/SpotifyAuthContext";
import { UserProvider, useUser } from "./src/context/UserContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";

function Root() {
  const { firebaseUser, loading } = useUser();
  const { colors, isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Đảm bảo splash screen hiển thị ít nhất 2.5s
    const timer = setTimeout(() => {
      if (!loading) {
        setShowSplash(false);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [loading]);

  // Show splash screen first
  if (showSplash || loading) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      {firebaseUser ? (
        <SpotifyAuthProvider>
          <AppNavigator />
        </SpotifyAuthProvider>
      ) : (
        <LoginScreen />
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <SafeAreaProvider>
          <Root />
        </SafeAreaProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
