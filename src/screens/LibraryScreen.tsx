// src/screens/LibraryScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppStyles as styles } from "../styles/AppStyles"; // ✅ Chỉ dùng 1 nguồn styles duy nhất

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import {
  getSavedToken,
  getUserPlaylists,
  getUserProfile,
  createPlaylist,
} from "../services/spotifyService";

import { doc, setDoc } from "firebase/firestore"; // Bỏ getDoc vì không cần merge nữa
import { db, auth } from "../config/firebaseConfig";

export default function LibraryScreen() {
  const navigation = useNavigation<any>();

  // State
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Create Playlist State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);

  // Mỗi khi màn hình được focus, load lại danh sách
  useFocusEffect(
    useCallback(() => {
      fetchPlaylists();
    }, [])
  );

  const toggleViewMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
  };

  const fetchPlaylists = async () => {
    try {
      if (!auth.currentUser) return;
      // ✅ FIX: Truyền uid vào getSavedToken để lấy đúng token
      const token = await getSavedToken(auth.currentUser.uid);
      
      if (token) {
        const data = await getUserPlaylists(token);
        const rawPlaylists = data.items || [];
        
        // ✅ FIX QUAN TRỌNG:
        // Sử dụng trực tiếp dữ liệu từ Spotify để đảm bảo số lượng bài hát (total) luôn đúng.
        // Không cần merge với Firestore nữa vì Spotify là nguồn dữ liệu gốc (Single Source of Truth).
        setPlaylists(rawPlaylists); 
      }
    } catch (error) {
      if (__DEV__) console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên Playlist");
      return;
    }
    setCreating(true);
    try {
      if (!auth.currentUser) return;
      const token = await getSavedToken(auth.currentUser.uid);
      if (!token) return;

      const user = await getUserProfile(token);

      // 1. Tạo trên Spotify
      const newPl = await createPlaylist(token, user.id, newPlaylistName);

      // 2. Lưu vào Firestore để backup (nếu cần dùng sau này)
      if (auth.currentUser) {
        await setDoc(doc(db, "playlists", newPl.id), {
          spotifyId: newPl.id,
          name: newPlaylistName,
          ownerId: auth.currentUser.uid,
          createdAt: new Date().toISOString(),
          trackCount: 0,
        });
      }

      setCreateModalVisible(false);
      setNewPlaylistName("");
      fetchPlaylists(); // Load lại để thấy playlist mới
      Alert.alert("Thành công", "Đã tạo playlist mới!");
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setCreating(false);
    }
  };

  const openPlaylistDetail = (playlist: any, index: number) => {
    navigation.navigate("PlaylistDetail", {
      playlist: playlist,
      playlistIndex: index,
      allPlaylists: playlists,
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Thư viện</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={toggleViewMode} style={styles.iconBtn}>
              <Ionicons
                name={viewMode === "grid" ? "list" : "grid"}
                size={24}
                color="#1DB954"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCreateModalVisible(true)}
              style={styles.createBtn}
            >
              <Text style={styles.createBtnText}>+ Tạo mới</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Liked Songs Card */}
        <TouchableOpacity
          style={styles.likedSongsCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("LikedSongs");
          }}
          activeOpacity={0.7}
        >
          <View style={styles.likedSongsIcon}>
            <Ionicons name="heart" size={32} color="white" />
          </View>
          <View style={styles.likedSongsInfo}>
            <Text style={styles.likedSongsTitle}>Liked Songs</Text>
            <Text style={styles.likedSongsSubtitle}>Your favorite tracks</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#888" />
        </TouchableOpacity>

        {/* Playlist List */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1DB954"
            style={{ marginTop: 50 }}
          />
        ) : (
          <FlatList
            key={viewMode}
            data={playlists}
            keyExtractor={(item) => item.id}
            numColumns={viewMode === "grid" ? 2 : 1}
            columnWrapperStyle={
              viewMode === "grid"
                ? { justifyContent: "space-between" }
                : undefined
            }
            contentContainerStyle={{ paddingBottom: 150 }}
            refreshing={loading}
            onRefresh={fetchPlaylists}
            ListEmptyComponent={
              <Text
                style={{ color: "#777", textAlign: "center", marginTop: 50 }}
              >
                Chưa có playlist nào.
              </Text>
            }
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={viewMode === "grid" ? styles.gridItem : styles.listItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  openPlaylistDetail(item, index);
                }}
                activeOpacity={0.7}
              >
                <Image
                  source={{
                    uri:
                      item.images?.[0]?.url ||
                      "https://via.placeholder.com/150",
                  }}
                  style={viewMode === "grid" ? styles.gridImg : styles.listImg}
                />
                <View style={viewMode === "list" ? styles.listInfo : {}}>
                  <Text
                    style={styles.name}
                    numberOfLines={viewMode === "grid" ? 2 : 1}
                  >
                    {item.name}
                  </Text>
                  {/* ✅ FIX: Hiển thị đúng số bài từ Spotify */}
                  <Text style={styles.count}>
                    {item.tracks?.total || 0} bài hát
                  </Text>
                </View>
                {viewMode === "list" && (
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                )}
              </TouchableOpacity>
            )}
          />
        )}

        {/* Modal Create Playlist */}
        <Modal
          visible={createModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Tạo Playlist Mới</Text>
              <TextInput
                style={styles.input}
                placeholder="Tên playlist..."
                placeholderTextColor="#888"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Text style={styles.btnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnConfirm]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  <Text style={styles.btnText}>
                    {creating ? "Đang tạo..." : "Tạo"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

// ✅ FIX: ĐÃ XÓA KHỐI 'const styles = ...' Ở ĐÂY ĐỂ TRÁNH LỖI XUNG ĐỘT