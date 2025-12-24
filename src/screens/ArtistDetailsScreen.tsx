import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
  ImageBackground,
  StatusBar,
  Modal,
  Alert,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";

import { useTheme } from "../context/ThemeContext";
import { useMusic } from "../context/MusicContext";
import {
  getSavedToken,
  getArtistDetails,
  getArtistTopTracks,
  getArtistAlbums,
  getUserPlaylists,
  addTrackToPlaylist,
  addItemToQueue,
} from "../services/spotifyService";
import { auth, db } from "../config/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { NowPlayingIndicator } from "../components/NowPlayingIndicator";
import chunkArray from "../utils/chunkArray";

const { width, height } = Dimensions.get("window");

export default function ArtistDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { artistId } = route.params as { artistId: string };

  const { colors, isDark } = useTheme();
  const { playTrack, currentTrack, isPlaying, addToQueue, insertNext } =
    useMusic();

  const [artist, setArtist] = useState<any>(null);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- SWIPE & MODAL STATE ---
  const rowRefs = useRef(new Map());
  const [modalVisible, setModalVisible] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [playlistsContainingTrack, setPlaylistsContainingTrack] = useState<
    Set<string>
  >(new Set());
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadArtistData();
    loadMyPlaylists();
  }, [artistId]);

  // --- LOGIC LOAD DATA ---
  const loadArtistData = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) return;
      const token = await getSavedToken(auth.currentUser.uid);
      if (!token) return;

      const [artistData, tracksData, albumsData] = await Promise.all([
        getArtistDetails(token, artistId),
        getArtistTopTracks(token, artistId),
        getArtistAlbums(token, artistId),
      ]);

      setArtist(artistData);
      setTopTracks(tracksData.tracks || []);
      setAlbums(albumsData.items || []);
    } catch (error) {
      console.error("Error loading artist data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyPlaylists = async () => {
    if (!auth.currentUser) return;
    const token = await getSavedToken(auth.currentUser.uid);
    if (token) {
      const data = await getUserPlaylists(token);
      setMyPlaylists(data.items || []);
    }
  };

  // --- ACTIONS HANDLERS ---
  const handleAddToQueue = async (track: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ref = rowRefs.current.get(track.id);
    if (ref) ref.close();

    addToQueue(track); // Local

    if (auth.currentUser) {
      const token = await getSavedToken(auth.currentUser.uid);
      if (token) {
        try {
          await addItemToQueue(token, track.uri);
        } catch (e) {}
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Added", "Added to playback queue");
  };

  const handleAddToPlaylist = async (
    playlistId: string,
    playlistName: string
  ) => {
    if (!selectedTrack || !auth.currentUser) return;
    setAdding(true);
    try {
      const token = await getSavedToken(auth.currentUser.uid);
      if (!token) return;

      await addTrackToPlaylist(token, playlistId, selectedTrack.uri);

      const trackRef = doc(
        db,
        "playlists",
        playlistId,
        "tracks",
        selectedTrack.id
      );
      await setDoc(trackRef, {
        spotifyId: selectedTrack.id,
        name: selectedTrack.name,
        uri: selectedTrack.uri,
        artist: selectedTrack.artists[0]?.name || "Unknown",
        imageUrl: selectedTrack.album.images[0]?.url || null,
        addedAt: new Date().toISOString(),
      });

      setAddedTrackIds((prev) => new Set(prev).add(selectedTrack.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `Added to ${playlistName}`);
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Could not add track");
    } finally {
      setAdding(false);
    }
  };

  const handlePlayArtist = () => {
    if (topTracks.length > 0) {
      playTrack(topTracks[0], topTracks);
    }
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "M Followers";
    if (count >= 1000) return (count / 1000).toFixed(1) + "K Followers";
    return count + " Followers";
  };

  const handleOpenOptions = async (track: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTrack(track);
    setModalVisible(true);

    setPlaylistsContainingTrack(new Set());

    if (myPlaylists.length === 0) return;

    const checkedSet = new Set<string>();

    await Promise.all(
      myPlaylists.map(async (playlist) => {
        try {
          const docRef = doc(db, "playlists", playlist.id, "tracks", track.id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            checkedSet.add(playlist.id);
          }
        } catch (e) {
          console.warn("Error checking playlist:", e);
        }
      })
    );

    setPlaylistsContainingTrack(checkedSet);
  };

  const trackChunks = chunkArray(topTracks, 5);

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (!artist) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* --- HEADER IMAGE --- */}
          <View style={styles.headerContainer}>
            <ImageBackground
              source={{ uri: artist.images?.[0]?.url }}
              style={styles.headerImage}
            >
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.1)", colors.background]}
                style={styles.gradientOverlay}
              />
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={28} color="white" />
              </TouchableOpacity>
              <View style={styles.artistInfo}>
                <Text style={styles.artistName}>{artist.name}</Text>
                <Text style={styles.followersText}>
                  {formatFollowers(artist.followers.total)}
                </Text>
              </View>
            </ImageBackground>
          </View>

          {/* --- ACTION BUTTONS --- */}
          <View style={styles.actionsContainer}>
            <Text style={[styles.genresText, { color: colors.textSecondary }]}>
              {artist.genres.slice(0, 3).join(" • ")}
            </Text>
            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayArtist}
            >
              <Ionicons
                name="play"
                size={32}
                color="white"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>

          {/* --- POPULAR SONGS SECTION (Có Swipe) --- */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Popular
            </Text>
            <FlatList
              horizontal
              pagingEnabled
              data={trackChunks}
              keyExtractor={(_, index) => `page-${index}`}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: chunk, index: pageIndex }) => (
                <View style={{ width: width }}>
                  {chunk.map((track: any, trackIndex: number) => {
                    const isTrackPlaying =
                      currentTrack?.id === track.id && isPlaying;
                    const realIndex = pageIndex * 5 + trackIndex + 1;

                    return (
                      <TouchableOpacity
                        key={track.id}
                        style={[
                          styles.trackRow,
                          { backgroundColor: colors.background },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => playTrack(track, topTracks)}
                      >
                        {/* 1. Số thứ tự */}
                        <Text
                          style={[
                            styles.trackIndex,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {realIndex}
                        </Text>

                        {/* 2. Ảnh bìa */}
                        <Image
                          source={{ uri: track.album.images[0]?.url }}
                          style={styles.trackImage}
                        />

                        {/* 3. Thông tin bài hát */}
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text
                            style={[
                              styles.trackName,
                              {
                                color: isTrackPlaying ? "#1DB954" : colors.text,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {track.name}
                          </Text>
                          <Text
                            style={[
                              styles.trackPlays,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {track.popularity * 10000} plays
                          </Text>
                        </View>

                        {/* 4. Indicator đang phát (Nếu có) */}
                        {isTrackPlaying && (
                          <NowPlayingIndicator isPlaying={true} />
                        )}

                        {/* 5. NÚT MORE (Ba chấm) - Giải pháp thay thế vuốt */}
                        <TouchableOpacity
                          style={styles.moreBtn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Tăng vùng bấm
                          onPress={() => handleOpenOptions(track)}
                        >
                          <Ionicons
                            name="ellipsis-horizontal"
                            size={24}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />
          </View>

          {/* --- ALBUMS SECTION --- */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Popular Releases
            </Text>
            <FlatList
              horizontal
              data={albums}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingLeft: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.albumCard}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate("AlbumDetails", {
                      albumId: item.id,
                      albumData: item.album,
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.images[0]?.url }}
                    style={styles.albumImage}
                  />
                  <Text
                    style={[styles.albumName, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {item.release_date.substring(0, 4)} • {item.type}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </ScrollView>

        {/* --- MODAL PLAYLIST --- */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalView, { backgroundColor: "#282828" }]}>
              {/* Header Modal: Thông tin bài hát */}
              {selectedTrack && (
                <View style={styles.modalHeader}>
                  <Image
                    source={{ uri: selectedTrack.album.images[0]?.url }}
                    style={styles.modalTrackImg}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTrackName} numberOfLines={1}>
                      {selectedTrack.name}
                    </Text>
                    <Text style={styles.modalArtistName}>
                      {selectedTrack.artists[0].name}
                    </Text>
                  </View>
                </View>
              )}

              {/* --- PLAY NEXT --- */}
              <TouchableOpacity
                style={[
                  styles.queueOptionBtn,
                  { backgroundColor: "#1DB954", marginBottom: 10 },
                ]}
                onPress={() => {
                  insertNext(selectedTrack);
                  setModalVisible(false);
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                }}
              >
                <Ionicons name="return-down-forward" size={24} color="white" />
                <Text style={styles.queueOptionText}>Play Next</Text>
              </TouchableOpacity>

              {/* Nút Add to Queue */}
              <TouchableOpacity
                style={styles.queueOptionBtn}
                onPress={() => {
                  handleAddToQueue(selectedTrack);
                  setModalVisible(false);
                }}
              >
                <Ionicons name="list" size={24} color="white" />
                <Text style={styles.queueOptionText}>Add to Queue</Text>
              </TouchableOpacity>

              <View style={styles.divider} />
              <Text style={styles.modalSectionTitle}>Save to Playlist</Text>

              {/* Danh sách Playlist */}
              {adding ? (
                <ActivityIndicator
                  size="large"
                  color="#1DB954"
                  style={{ margin: 20 }}
                />
              ) : (
                <FlatList
                  data={myPlaylists}
                  keyExtractor={(item) => item.id}
                  style={{ width: "100%", maxHeight: 250 }}
                  renderItem={({ item }) => {
                    const hasSong = playlistsContainingTrack.has(item.id);

                    return (
                      <TouchableOpacity
                        style={[
                          styles.playlistOption,
                          hasSong && { opacity: 0.5, backgroundColor: "#333" },
                        ]}
                        onPress={() =>
                          !hasSong && handleAddToPlaylist(item.id, item.name)
                        }
                        disabled={hasSong}
                      >
                        <Image
                          source={{ uri: item.images?.[0]?.url }}
                          style={styles.playlistThumb}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.playlistName,
                              hasSong && { color: "#aaa" },
                            ]}
                          >
                            {item.name}
                          </Text>
                          {hasSong && (
                            <Text
                              style={{
                                color: "#1DB954",
                                fontSize: 11,
                                fontWeight: "bold",
                              }}
                            >
                              Already Added
                            </Text>
                          )}
                        </View>
                        {hasSong && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#1DB954"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  headerContainer: { height: height * 0.45, width: "100%" },
  headerImage: { width: "100%", height: "100%", justifyContent: "flex-end" },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 8,
    borderRadius: 20,
  },
  artistInfo: { padding: 20, paddingBottom: 10 },
  artistName: {
    fontSize: 48,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  followersText: {
    fontSize: 14,
    color: "#e0e0e0",
    fontWeight: "600",
    textTransform: "uppercase",
  },

  // Actions
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: -28,
    marginBottom: 20,
    zIndex: 10,
  },
  genresText: { fontSize: 13, textTransform: "capitalize", maxWidth: "70%" },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1DB954",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },

  // Sections
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 20,
    marginBottom: 15,
  },

  // Track Row
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    height: 75,
  }, // Cần fixed height để swipe đẹp hơn
  trackIndex: { width: 25, fontSize: 16, textAlign: "center", marginRight: 10 },
  trackImage: { width: 50, height: 50, borderRadius: 4, marginRight: 15 },
  trackName: { fontSize: 16, fontWeight: "500", marginBottom: 4 },
  trackPlays: { fontSize: 13 },

  // Album Card
  albumCard: { width: 140, marginRight: 15 },
  albumImage: { width: 140, height: 140, borderRadius: 8, marginBottom: 8 },
  albumName: { fontSize: 14, fontWeight: "600", marginBottom: 2 },

  // --- SWIPE ACTIONS STYLES ---
  rightActionsContainer: { width: 160, flexDirection: "row", height: "100%" },
  actionBtn: {
    width: 80,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: { color: "white", fontSize: 11, fontWeight: "600", marginTop: 4 },

  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalView: {
    width: "85%",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 15,
  },
  playlistOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    width: "100%",
    borderBottomWidth: 0.5,
    borderBottomColor: "#444",
  },
  playlistThumb: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: "#444",
  },
  playlistName: { color: "white", fontSize: 15 },
  closeBtn: {
    marginTop: 15,
    padding: 12,
    width: "100%",
    alignItems: "center",
    backgroundColor: "#444",
    borderRadius: 8,
  },
  moreBtn: {
    padding: 5,
    marginLeft: 10,
  },

  // Modal mới đẹp hơn
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "#444",
    paddingBottom: 15,
  },
  modalTrackImg: { width: 50, height: 50, borderRadius: 4, marginRight: 15 },
  modalTrackName: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  modalArtistName: { color: "#b3b3b3", fontSize: 14 },

  // Nút Queue to đẹp
  queueOptionBtn: {
    flexDirection: "row",
    backgroundColor: "#7B61FF", // Màu tím nổi bật
    width: "100%",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  queueOptionText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },

  divider: {
    height: 1,
    backgroundColor: "#444",
    width: "100%",
    marginBottom: 15,
  },
  modalSectionTitle: {
    color: "#b3b3b3",
    fontSize: 12,
    alignSelf: "flex-start",
    marginBottom: 10,
    textTransform: "uppercase",
    fontWeight: "bold",
  },
});
