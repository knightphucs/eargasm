// src/screens/PlaylistDetailScreen.tsx
import React, { useState, useEffect, useRef } from "react";
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
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
  Directions,
} from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";
import * as Animatable from "react-native-animatable";
import { LinearGradient } from "expo-linear-gradient";
import { AppStyles as styles } from "../styles/AppStyles";
import {
  getSavedToken,
  getPlaylistTracks,
  removeTrackFromPlaylist,
  searchSpotify,
  addTrackToPlaylist,
} from "../services/spotifyService";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../config/firebaseConfig";
import { useMusic } from "../context/MusicContext";

const { width } = Dimensions.get("window");

// Debounce Utility
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

export default function PlaylistDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();

  const {
    playlist: initialPlaylist,
    playlistIndex,
    allPlaylists,
  } = route.params;

  const [currentPlaylist, setCurrentPlaylist] = useState(initialPlaylist);
  const [currentIndex, setCurrentIndex] = useState(playlistIndex);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [animationType, setAnimationType] = useState("fadeIn");

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 500);

  const { playTrack, currentTrack, isPlaying } = useMusic();
  const rowRefs = useRef(new Map());

  useEffect(() => {
    fetchTracks();
  }, [currentPlaylist]);

  useEffect(() => {
    if (debouncedSearch.length > 2) searchSpotifyTracks(debouncedSearch);
    else setSearchResults([]);
  }, [debouncedSearch]);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const token = await getSavedToken();
      if (token) {
        const data = await getPlaylistTracks(token, currentPlaylist.id);
        setTracks(data.items || []);
      }
    } catch (e) {
      if (__DEV__) console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const switchPlaylist = (direction: "next" | "prev") => {
    if (!allPlaylists) return;
    let newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < allPlaylists.length) {
      if (direction === "next") {
        setAnimationType("fadeInRight");
      } else {
        setAnimationType("fadeInLeft");
      }
      setCurrentIndex(newIndex);
      setCurrentPlaylist(allPlaylists[newIndex]);
    }
  };

  const onSwipeLeft = () => switchPlaylist("next");
  const onSwipeRight = () => switchPlaylist("prev");

  const composedGesture = Gesture.Simultaneous(
    Gesture.Fling().direction(Directions.LEFT).runOnJS(true).onEnd(onSwipeLeft),
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .runOnJS(true)
      .onEnd(onSwipeRight)
  );

  const searchSpotifyTracks = async (query: string) => {
    const token = await getSavedToken();
    if (!token) return;
    const res = await searchSpotify(token, query, "track");
    setSearchResults(res.tracks?.items || []);
  };

  const handleToggleTrack = async (track: any) => {
    const isAdded = tracks.some((t) => t.track.id === track.id);
    const token = await getSavedToken();
    if (!token) return;

    try {
      if (isAdded) {
        await removeTrackFromPlaylist(token, currentPlaylist.id, track.uri);
        setTracks((prev) => prev.filter((t) => t.track.id !== track.id));
      } else {
        await addTrackToPlaylist(token, currentPlaylist.id, track.uri);
        setTracks((prev) => [
          ...prev,
          { track, added_at: new Date().toISOString() },
        ]);
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    }
  };

  const handleDelete = async (track: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const token = await getSavedToken();
    if (!token) return;

    try {
      // Animate removal
      await removeTrackFromPlaylist(token, currentPlaylist.id, track.uri);

      const trackRef = doc(
        db,
        "playlists",
        currentPlaylist.id,
        "tracks",
        track.id
      );
      await deleteDoc(trackRef);

      // Update state with smooth transition
      const newTracks = tracks.filter((t) => t.track.id !== track.id);
      setTracks(newTracks);

      const playlistRef = doc(db, "playlists", currentPlaylist.id);
      updateDoc(playlistRef, { trackCount: newTracks.length });

      // Success haptic
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 150);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Lỗi", "Không thể xóa bài hát");
    }
  };

  const renderRightActions = (progress: any, dragX: any, track: any) => (
    <View style={{ width: 80 }}>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(track)}
      >
        <Ionicons name="trash" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderHeader = React.useCallback(
    () => (
      <View style={styles.headerContainer}>
        <Animatable.View
          animation="zoomIn"
          duration={1000}
          useNativeDriver
          style={[
            styles.coverShadow,
            {
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.2)",
              borderRadius: 12,
            },
          ]}
        >
          <Image
            source={{
              uri:
                currentPlaylist.images?.[0]?.url ||
                "https://via.placeholder.com/300",
            }}
            style={styles.coverImage}
          />
        </Animatable.View>

        <Animatable.View
          animation="fadeInUp"
          duration={600}
          delay={100}
          useNativeDriver
          style={{ alignItems: "center" }}
        >
          <Text style={styles.headerTitle} numberOfLines={2}>
            {currentPlaylist.name}
          </Text>
          <Text style={styles.headerSubtitle}>
            {currentPlaylist.owner?.display_name || "Eargasm"} • {tracks.length}{" "}
            tracks
          </Text>
        </Animatable.View>

        <Animatable.View
          animation="fadeInUp"
          duration={600}
          delay={200}
          style={styles.buttonRow}
          useNativeDriver
        >
          <TouchableOpacity
            style={{ flex: 1, marginRight: 15 }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (tracks.length > 0)
                playTrack(
                  tracks[0].track,
                  tracks.map((t) => t.track)
                );
            }}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#E91E63", "#9C27B0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons name="play" size={24} color="white" />
              <Text style={styles.gradientButtonText}>PHÁT NGAY</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.circleButton} activeOpacity={0.7}>
            <Ionicons name="shuffle" size={24} color="#E91E63" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleButton} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={24} color="#E91E63" />
          </TouchableOpacity>
        </Animatable.View>
      </View>
    ),
    [currentPlaylist, tracks.length]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
      <Image
        source={{
          uri:
            currentPlaylist.images?.[0]?.url ||
            "https://via.placeholder.com/300",
        }}
        style={StyleSheet.absoluteFillObject}
        blurRadius={40}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: "rgba(0,0,0,0.6)" },
        ]}
      />

      <GestureDetector gesture={composedGesture}>
        <Animatable.View
          style={{ flex: 1 }}
          key={currentPlaylist.id}
          animation={animationType}
          duration={400}
          useNativeDriver
        >
          <View style={{ flex: 1 }}>
            <View style={styles.navBar}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
              >
                <Ionicons name="chevron-back" size={30} color="white" />
                <Text style={styles.backText}>Thư viện</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons
                  name="ellipsis-horizontal-circle"
                  size={30}
                  color="white"
                />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator
                size="large"
                color="#E91E63"
                style={{ marginTop: 100 }}
              />
            ) : (
              <FlatList
                data={tracks}
                keyExtractor={(item, i) =>
                  `${item.track?.id || i}-${currentPlaylist.id}`
                }
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                ListHeaderComponent={renderHeader}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={10}
                initialNumToRender={8}
                updateCellsBatchingPeriod={50}
                ListFooterComponent={
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setAddModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={24} color="#E91E63" />
                    <Text style={styles.addText}>Thêm nhạc</Text>
                  </TouchableOpacity>
                }
                renderItem={({ item, index }) => {
                  const track = item.track;
                  if (!track) return null;
                  const active = currentTrack?.id === track.id && isPlaying;
                  return (
                    <Swipeable
                      ref={(ref) => {
                        if (ref) rowRefs.current.set(track.id, ref);
                      }}
                      renderRightActions={(p, d) =>
                        renderRightActions(p, d, track)
                      }
                      overshootRight={false}
                    >
                      <Animatable.View
                        animation="fadeInRight"
                        duration={300}
                        delay={index * 30}
                        useNativeDriver
                      >
                        <TouchableOpacity
                          style={[
                            styles.rowCard,
                            active && {
                              borderColor: "#E91E63",
                              borderWidth: 1,
                              backgroundColor: "rgba(233, 30, 99, 0.1)",
                            },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light
                            );
                            playTrack(
                              track,
                              tracks.map((t) => t.track)
                            );
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={{
                              color: "#888",
                              marginRight: 10,
                              width: 20,
                              textAlign: "center",
                            }}
                          >
                            {index + 1}
                          </Text>
                          <Image
                            source={{ uri: track.album.images[0]?.url }}
                            style={styles.thumb}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.tName,
                                active && { color: "#E91E63" },
                              ]}
                              numberOfLines={1}
                            >
                              {track.name}
                            </Text>
                            <Text style={styles.tArtist} numberOfLines={1}>
                              {track.artists[0].name}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={{ padding: 5 }}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="ellipsis-vertical"
                              size={20}
                              color="#bbb"
                            />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </Animatable.View>
                    </Swipeable>
                  );
                }}
              />
            )}
            <Modal
              visible={addModalVisible}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setAddModalVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Thêm bài hát</Text>
                  <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                    <Text style={{ color: "#E91E63" }}>Đóng</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Tìm kiếm..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const isAdded = tracks.some((t) => t.track.id === item.id);
                    return (
                      <View style={styles.searchRow}>
                        <Image
                          source={{ uri: item.album.images?.[0]?.url }}
                          style={styles.thumb}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tName}>{item.name}</Text>
                          <Text style={styles.tArtist}>
                            {item.artists[0].name}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleToggleTrack(item)}
                        >
                          <Ionicons
                            name={
                              isAdded
                                ? "checkmark-circle"
                                : "add-circle-outline"
                            }
                            size={28}
                            color={isAdded ? "#1DB954" : "#E91E63"}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                />
              </View>
            </Modal>
          </View>
        </Animatable.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
