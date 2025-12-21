import React from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import LoginScreen from "./src/screens/LoginScreen";
import AppNavigator from "./src/navigation/AppNavigator";
import { SpotifyAuthProvider } from "./src/context/SpotifyAuthContext";
import { UserProvider, useUser } from "./src/context/UserContext";

function Root() {
  const { firebaseUser, loading } = useUser();

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

  return firebaseUser ? (
    <SpotifyAuthProvider>
      <AppNavigator />
    </SpotifyAuthProvider>
  ) : (
    <LoginScreen />
  );
}

export default function App() {
  return (
    <UserProvider>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <Root />
      </SafeAreaProvider>
    </UserProvider>
  );
}
