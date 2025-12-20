import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";

import {
  getSavedToken,
  getUserPlaylists,
  getUserProfile,
  createPlaylist,
  getPlaylistTracks,
  removeTrackFromPlaylist,
} from "../services/spotifyService";

import { doc, setDoc, updateDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../config/firebaseConfig";
import { useMusic } from "../context/MusicContext";

export default function LibraryScreen() {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Playlist State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);

  // Detail View State
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const { playTrack, currentTrack, isPlaying } = useMusic();
  const rowRefs = useRef(new Map());

  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").width)
  ).current;

  useFocusEffect(
    useCallback(() => {
      fetchPlaylists();
    }, [])
  );

  const fetchPlaylists = async () => {
    try {
      const token = await getSavedToken();
      if (token) {
        const data = await getUserPlaylists(token);
        const rawPlaylists = data.items || [];
        const mergedPlaylists = await Promise.all(
          rawPlaylists.map(async (p: any) => {
            try {
              const docRef = doc(db, "playlists", p.id);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                const firebaseData = docSnap.data();
                const realCount =
                  firebaseData.trackCount !== undefined
                    ? firebaseData.trackCount
                    : p.tracks.total;
                return { ...p, tracks: { ...p.tracks, total: realCount } };
              }
            } catch (e) {}
            return p;
          })
        );
        setPlaylists(mergedPlaylists);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Error", "Enter a name");
      return;
    }
    setCreating(true);
    try {
      const token = await getSavedToken();
      if (!token) return;
      const user = await getUserProfile(token);
      const newPl = await createPlaylist(token, user.id, newPlaylistName);
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
      fetchPlaylists();
      Alert.alert("Success", "Playlist created");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setCreating(false);
    }
  };

  const openPlaylistDetail = async (playlist: any) => {
    setSelectedPlaylist(playlist);
    setDetailModalVisible(true);

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setLoadingTracks(true);
    setPlaylistTracks([]);
    try {
      const token = await getSavedToken();
      if (token) {
        const data = await getPlaylistTracks(token, playlist.id);
        setPlaylistTracks(data.items || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingTracks(false);
    }
  };

  const closeDetail = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").width,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setDetailModalVisible(false);
    });
  };

  const handleRemoveTrack = async (track: any) => {
    Alert.alert(
      "Delete Song",
      `Are you sure you want to remove "${track.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            const ref = rowRefs.current.get(track.id);
            if (ref) ref.close();
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            executeRemove(track);
          },
        },
      ]
    );
  };

  const executeRemove = async (track: any) => {
    try {
      const token = await getSavedToken();
      if (!token || !selectedPlaylist) return;
      await removeTrackFromPlaylist(token, selectedPlaylist.id, track.uri);
      const trackRef = doc(
        db,
        "playlists",
        selectedPlaylist.id,
        "tracks",
        track.id
      );
      await deleteDoc(trackRef);
      const newTracks = playlistTracks.filter(
        (item) => item.track.id !== track.id
      );
      setPlaylistTracks(newTracks);
      const playlistRef = doc(db, "playlists", selectedPlaylist.id);
      updateDoc(playlistRef, { trackCount: newTracks.length });
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === selectedPlaylist.id)
            return { ...p, tracks: { ...p.tracks, total: newTracks.length } };
          return p;
        })
      );
      Alert.alert("Deleted", "Song removed.");
    } catch (error) {
      Alert.alert("Error", "Could not delete.");
    }
  };

  const renderRightActions = (progress: any, dragX: any, track: any) => {
    const trans = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [80, 0],
      extrapolate: "clamp",
    });
    return (
      <View style={{ width: 80, flexDirection: "row" }}>
        <TouchableOpacity
          style={[styles.deleteBtn]}
          onPress={() => handleRemoveTrack(track)}
        >
          <Ionicons name="trash" size={24} color="white" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Library</Text>
          <TouchableOpacity
            onPress={() => setCreateModalVisible(true)}
            style={styles.createBtn}
          >
            <Text style={styles.createBtnText}>+ Create Playlist</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1DB954"
            style={{ marginTop: 50 }}
          />
        ) : (
          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={{ paddingBottom: 150 }}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            onRefresh={fetchPlaylists}
            refreshing={loading}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() => openPlaylistDetail(item)}
              >
                <Image
                  source={{
                    uri:
                      item.images?.[0]?.url ||
                      "https://via.placeholder.com/150",
                  }}
                  style={styles.img}
                />
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.count}>
                  {item.tracks?.total || 0} songs
                </Text>
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
              <Text style={styles.modalTitle}>New Playlist</Text>
              <TextInput
                style={styles.input}
                placeholder="Playlist name..."
                placeholderTextColor="#888"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnConfirm]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  <Text style={styles.btnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {detailModalVisible && (
          <Animated.View
            style={[
              styles.fullScreenOverlay,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
                marginTop: 50,
                paddingHorizontal: 20,
              }}
            >
              <TouchableOpacity onPress={closeDetail} style={{ padding: 10 }}>
                <Ionicons name="arrow-back" size={30} color="white" />
              </TouchableOpacity>
              <Text
                style={[
                  styles.title,
                  { marginBottom: 0, marginLeft: 10, flex: 1 },
                ]}
                numberOfLines={1}
              >
                {selectedPlaylist?.name}
              </Text>
            </View>

            {loadingTracks ? (
              <ActivityIndicator
                size="large"
                color="#1DB954"
                style={{ marginTop: 50 }}
              />
            ) : (
              <FlatList
                data={playlistTracks}
                keyExtractor={(item, index) =>
                  item.track?.id
                    ? `${item.track.id}_${index}`
                    : index.toString()
                }
                contentContainerStyle={{
                  paddingBottom: 150,
                  paddingHorizontal: 20,
                }}
                ListEmptyComponent={
                  <Text
                    style={{
                      color: "gray",
                      textAlign: "center",
                      marginTop: 50,
                    }}
                  >
                    No songs yet.
                  </Text>
                }
                renderItem={({ item }) => {
                  const track = item.track;
                  if (!track) return null;
                  const isTrackPlaying =
                    currentTrack?.id === track.id && isPlaying;

                  return (
                    <Swipeable
                      ref={(ref) => {
                        if (ref && track.id) rowRefs.current.set(track.id, ref);
                      }}
                      renderRightActions={(p, d) =>
                        renderRightActions(p, d, track)
                      }
                      overshootRight={false}
                    >
                      <TouchableOpacity
                        style={[
                          styles.trackRow,
                          isTrackPlaying && { backgroundColor: "#333" },
                        ]}
                        onPress={() => playTrack(track)}
                        activeOpacity={1}
                      >
                        <Image
                          source={{ uri: track.album.images[0]?.url }}
                          style={styles.trackThumb}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.trackName,
                              isTrackPlaying && { color: "#1DB954" },
                            ]}
                            numberOfLines={1}
                          >
                            {track.name}
                          </Text>
                          <Text style={styles.trackArtist}>
                            {track.artists[0].name}
                          </Text>
                        </View>
                        <Ionicons
                          name={isTrackPlaying ? "pause" : "play"}
                          size={24}
                          color={isTrackPlaying ? "#1DB954" : "white"}
                        />
                      </TouchableOpacity>
                    </Swipeable>
                  );
                }}
              />
            )}
          </Animated.View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
    paddingTop: 50,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  title: { color: "white", fontSize: 28, fontWeight: "bold" },
  createBtn: {
    backgroundColor: "#282828",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1DB954",
  },
  createBtnText: { color: "#1DB954", fontWeight: "bold", fontSize: 14 },
  item: { width: "48%", marginBottom: 20 },
  img: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#333",
  },
  name: { color: "white", fontWeight: "bold", fontSize: 16 },
  count: { color: "#b3b3b3", fontSize: 14, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalView: {
    width: "85%",
    backgroundColor: "#282828",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 15,
  },
  input: {
    width: "100%",
    backgroundColor: "#3E3E3E",
    color: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  btn: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  btnCancel: { backgroundColor: "#555" },
  btnConfirm: { backgroundColor: "#1DB954" },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
    backgroundColor: "#121212",
    height: 70,
  },
  trackThumb: { width: 50, height: 50, borderRadius: 4, marginRight: 15 },
  trackName: { color: "white", fontWeight: "bold", fontSize: 16 },
  trackArtist: { color: "#b3b3b3", fontSize: 14 },
  deleteBtn: {
    backgroundColor: "#E91E63",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
  },
  deleteText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },

  // 👇 STYLE CHO FAKE MODAL (QUAN TRỌNG)
  fullScreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#121212",
    zIndex: 10, // Cao hơn list bên dưới nhưng thấp hơn MiniPlayer (App.tsx có zIndex cao hơn)
  },
});
