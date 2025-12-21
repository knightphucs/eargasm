import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./src/config/firebaseConfig";
import { SafeAreaProvider } from "react-native-safe-area-context";

import LoginScreen from "./src/screens/LoginScreen";
import AppNavigator from "./src/navigation/AppNavigator";
import { SpotifyAuthProvider } from "./src/context/SpotifyAuthContext";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: "#121212",
        }}
      >
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <SpotifyAuthProvider>
      <AppNavigator />
    </SpotifyAuthProvider>
  );
}
