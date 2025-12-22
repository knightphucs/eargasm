// src/screens/UserProfileScreen.tsx
import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";

import { useUser } from "../context/UserContext";
import { uploadAvatarToCloudinary } from "../services/avatarService";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

export default function UserProfileScreen() {
  const { userProfile, updateUserProfile, logout } = useUser();
  const { isDark, toggleTheme, colors } = useTheme();
  const navigation = useNavigation();

  // State
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || "");
      setBio(userProfile.bio || "");
    }
  }, [userProfile]);

  if (!userProfile) return null;

  const handlePickAvatar = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Cần quyền truy cập", "Bạn cần cấp quyền truy cập ảnh.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert("Lỗi", "Tên hiển thị không được để trống");
      return;
    }
    setSaving(true);
    try {
      let finalAvatarUrl = userProfile.avatarUrl;
      if (selectedImage) {
        finalAvatarUrl = await uploadAvatarToCloudinary(selectedImage);
      }
      await updateUserProfile({
        displayName: displayName,
        avatarUrl: finalAvatarUrl,
        bio: bio,
      });
      setSelectedImage(null);
      Alert.alert("Thành công", "Cập nhật hồ sơ thành công!");
    } catch (err: any) {
      Alert.alert("Lỗi", err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderAvatarSource = () => {
    if (selectedImage) return { uri: selectedImage };
    if (userProfile.avatarUrl) return { uri: userProfile.avatarUrl };
    return require("../../assets/avatar.png");
  };

  const currentAvatar = renderAvatarSource();

  return (
    <View style={styles.container}>
      <View style={styles.backgroundLayer}>
        <Image
          source={currentAvatar}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          blurRadius={50} // Làm mờ ảnh để tạo nền
        />
        <View style={styles.overlay} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header & Back Button */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleTheme();
              }}
              style={styles.themeButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={24}
                color="#1DB954"
              />
            </TouchableOpacity>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={currentAvatar}
                style={styles.avatar}
                transition={500}
                contentFit="cover"
              />

              {/* Camera Icon Badge */}
              <TouchableOpacity
                style={styles.editBadge}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handlePickAvatar();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="camera" size={20} color="black" />
              </TouchableOpacity>
            </View>

            {/* Unsaved Warning */}
            {selectedImage && (
              <View style={styles.unsavedContainer}>
                <Ionicons name="alert-circle" size={16} color="#FFD700" />
                <Text style={styles.unsavedText}>Image not saved yet</Text>
              </View>
            )}
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Email Field (Read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrapper, styles.readOnlyInput]}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#888"
                  style={styles.inputIcon}
                />
                <Text style={styles.inputTextReadOnly}>
                  {userProfile.email}
                </Text>
                <Ionicons name="lock-closed-outline" size={16} color="#555" />
              </View>
            </View>

            {/* Display Name Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="white"
                  style={styles.inputIcon}
                />
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={styles.textInput}
                  placeholder="Your display name"
                  placeholderTextColor="#555"
                />
                <Ionicons name="pencil-outline" size={16} color="#1DB954" />
              </View>
            </View>

            {/* Bio Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="text-outline"
                  size={20}
                  color="white"
                  style={styles.inputIcon}
                />
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  style={styles.textInput}
                  placeholder="Your bio"
                  placeholderTextColor="#555"
                />
                <Ionicons name="pencil-outline" size={16} color="#1DB954" />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleSave();
              }}
              disabled={saving}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={["#1DB954", "#1aa34a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.saveButton, saving && { opacity: 0.7 }]}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                logout();
              }}
              style={styles.logoutButton}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  // Background Effects
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)", // Phủ đen 70% lên ảnh nền mờ
  },

  scrollContent: {
    paddingBottom: 50,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: Platform.OS === "ios" ? 60 : 40,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
  },
  themeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(29,185,84,0.2)",
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  avatarWrapper: {
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#1DB954",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#121212",
  },
  unsavedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  unsavedText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Form
  formContainer: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: "#b3b3b3",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#282828",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "transparent",
  },
  readOnlyInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    color: "white",
    fontSize: 16,
    height: "100%",
  },
  inputTextReadOnly: {
    flex: 1,
    color: "#888",
    fontSize: 16,
  },

  // Buttons
  saveButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#1DB954",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  logoutButton: {
    marginTop: 20,
    alignItems: "center",
    padding: 16,
  },
  logoutText: {
    color: "#ff5252",
    fontSize: 14,
    fontWeight: "600",
  },
});
