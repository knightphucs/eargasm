// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Text, Alert } from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig"; // Import từ file bạn tạo hôm qua

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      // 1. Tạo user bên Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // 👇 2. Ghi ngay thông tin user vào Firestore Database
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: new Date().toISOString(),
        spotify: {
          isConnected: false,
          accessToken: null,
        },
      });

      Alert.alert("Thành công", "Tạo tài khoản và dữ liệu thành công!");
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Khi login thành công, Firebase sẽ tự cập nhật state, App.tsx sẽ tự chuyển màn hình
    } catch (error: any) {
      Alert.alert("Lỗi đăng nhập", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Eargasm</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <View style={styles.btnGroup}>
        <Button title="Đăng nhập" onPress={handleLogin} />
        <Button title="Đăng ký" onPress={handleRegister} color="gray" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  btnGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
});
