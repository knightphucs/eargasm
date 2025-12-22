// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isValidEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateInput = () => {
    if (!email.trim()) {
      Alert.alert("⚠️ Missing information", "Please enter your email");
      return false;
    }

    if (!isValidEmail(email)) {
      Alert.alert("⚠️ Invalid email", "Please enter a valid email");
      return false;
    }

    if (!password) {
      Alert.alert("⚠️ Missing information", "Please enter your password");
      return false;
    }

    if (password.length < 6) {
      Alert.alert(
        "⚠️ Password too short",
        "Password must be at least 6 characters long"
      );
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateInput()) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: user.email?.split("@")[0] ?? "New User",
        avatarUrl: null, // để thêm sửa avatar,displayname cho user
        createdAt: new Date().toISOString(),
        spotify: {
          isConnected: false,
          accessToken: null,
        },
      });

      Alert.alert("🎉 Success", "Successfully registered!");
    } catch (error: any) {
      Alert.alert("❌ Error", error.message);
    }
  };

  const handleLogin = async () => {
    if (!validateInput()) return;

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert("❌ Error signing in", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🎧 Eargasm</Text>
      <Text style={styles.subtitle}>Feel the music</Text>

      <View style={styles.card}>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={(text) => setEmail(text.trim())}
          style={styles.input}
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity
          style={[styles.loginBtn, (!email || !password) && { opacity: 0.5 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleLogin();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleRegister();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.registerText}>
            Don't have an account?{" "}
            <Text style={styles.registerBold}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    justifyContent: "center",
    padding: 20,
  },

  logo: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1DB954", // Spotify green vibe
    textAlign: "center",
    marginBottom: 5,
  },

  subtitle: {
    textAlign: "center",
    color: "#aaa",
    marginBottom: 40,
  },

  card: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },

  input: {
    backgroundColor: "#2a2a2a",
    color: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
  },

  loginBtn: {
    backgroundColor: "#1DB954",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 15,
  },

  loginText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },

  registerText: {
    color: "#aaa",
    textAlign: "center",
  },

  registerBold: {
    color: "#1DB954",
    fontWeight: "bold",
  },
});
