import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";

import {
  searchSpotify,
  getSavedToken,
  getUserPlaylists,
  addTrackToPlaylist,
  addItemToQueue,
} from "../services/spotifyService";
import { db, auth } from "../config/firebaseConfig";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

import { useMusic } from "../context/MusicContext";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { playTrack, currentTrack, isPlaying } = useMusic();

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [adding, setAdding] = useState(false);

  const [playlistsContainingTrack, setPlaylistsContainingTrack] = useState<
    Set<string>
  >(new Set());
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(new Set());

  const rowRefs = useRef(new Map());

  useEffect(() => {
    const initData = async () => {
      await loadMyPlaylists();
    };
    initData();
  }, []);

  useEffect(() => {
    if (myPlaylists.length > 0) scanAllUserTracks();
  }, [myPlaylists]);

  const loadMyPlaylists = async () => {
    const token = await getSavedToken();
    if (token) {
      const data = await getUserPlaylists(token);
      setMyPlaylists(data.items || []);
    }
  };

  const scanAllUserTracks = async () => {
    const allTrackIds = new Set<string>();
    await Promise.all(
      myPlaylists.map(async (playlist) => {
        try {
          const tracksRef = collection(db, "playlists", playlist.id, "tracks");
          const snapshot = await getDocs(tracksRef);
          snapshot.forEach((doc) => allTrackIds.add(doc.id));
        } catch (e) {
          console.log(e);
        }
      })
    );
    setAddedTrackIds(allTrackIds);
  };

  useEffect(() => {
    if (query.trim() === "") {
      setTracks([]);
      setArtists([]);
      return;
    }
    setLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      await executeSearch(query);
    }, 800);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const executeSearch = async (searchTerm: string) => {
    try {
      const token = await getSavedToken();
      if (!token) return;
      const data = await searchSpotify(token, searchTerm);
      setTracks(data.tracks?.items || []);
      setArtists(data.artists?.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToQueue = async (trackUri: string, trackId: string) => {
    const ref = rowRefs.current.get(trackId);
    if (ref) ref.close();
    const token = await getSavedToken();
    if (token) {
      await addItemToQueue(token, trackUri);
      Alert.alert("Added", "Added to playback queue");
    }
  };

  const handleOpenPlaylistModal = async (track: any) => {
    const ref = rowRefs.current.get(track.id);
    if (ref) ref.close();
    setSelectedTrack(track);
    if (myPlaylists.length === 0) await loadMyPlaylists();
    setModalVisible(true);
    setPlaylistsContainingTrack(new Set());
    const checkedSet = new Set<string>();
    await Promise.all(
      myPlaylists.map(async (playlist) => {
        try {
          const docRef = doc(db, "playlists", playlist.id, "tracks", track.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) checkedSet.add(playlist.id);
        } catch (e) {}
      })
    );
    setPlaylistsContainingTrack(checkedSet);
  };

  const handleAddToPlaylist = async (
    playlistId: string,
    playlistName: string
  ) => {
    if (!selectedTrack) return;
    setAdding(true);
    try {
      const token = await getSavedToken();
      if (!token) return;
      const result = await addTrackToPlaylist(
        token,
        playlistId,
        selectedTrack.uri
      );
      if (result.snapshot_id) {
        try {
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
            addedBy: auth.currentUser?.uid || "unknown",
          });
          setAddedTrackIds((prev) => new Set(prev).add(selectedTrack.id));
        } catch (err) {}
        Alert.alert("Success", `Added to playlist ${playlistName}`);
      } else {
        Alert.alert("Notice", "Spotify did not respond.");
      }
      setModalVisible(false);
      setSelectedTrack(null);
    } catch (error: any) {
      Alert.alert("Error", "Could not add to playlist.");
    } finally {
      setAdding(false);
    }
  };

  const renderRightActions = (progress: any, dragX: any, track: any) => {
    const trans = dragX.interpolate({
      inputRange: [-140, 0],
      outputRange: [0, 140],
      extrapolate: "clamp",
    });
    const isAdded = addedTrackIds.has(track.id);
    return (
      <View style={{ width: 140, flexDirection: "row" }}>
        <Animated.View style={{ flex: 1, transform: [{ translateX: trans }] }}>
          <TouchableOpacity
            style={[styles.rectBtn, { backgroundColor: "#FF8C00" }]}
            onPress={() => handleAddToQueue(track.uri, track.id)}
          >
            <Ionicons name="list" size={24} color="white" />
            <Text style={styles.rectBtnText}>Queue</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ flex: 1, transform: [{ translateX: trans }] }}>
          <TouchableOpacity
            style={[
              styles.rectBtn,
              { backgroundColor: isAdded ? "#555" : "#1DB954" },
            ]}
            onPress={() => !isAdded && handleOpenPlaylistModal(track)}
            disabled={isAdded}
          >
            {isAdded ? (
              <Ionicons name="checkmark-circle" size={28} color="#aaa" />
            ) : (
              <Ionicons name="add" size={28} color="white" />
            )}
            <Text style={[styles.rectBtnText, isAdded && { color: "#aaa" }]}>
              {isAdded ? "Added" : "Add"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderHeader = () => {
    if (artists.length === 0) return null;
    return (
      <View style={{ marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>Artists</Text>
        <FlatList
          horizontal
          data={artists}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.artistItem}>
              <Image
                source={{
                  uri: item.images[0]?.url || "https://via.placeholder.com/100",
                }}
                style={styles.artistImg}
              />
              <Text style={styles.artistName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          )}
        />
        {tracks.length > 0 && <Text style={styles.sectionTitle}>Songs</Text>}
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={24} color="#555" />
          <TextInput
            style={styles.input}
            placeholder="Songs, artists..."
            placeholderTextColor="#777"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color="gray" />
            </TouchableOpacity>
          )}
        </View>

        {loading && (
          <ActivityIndicator
            size="small"
            color="#1DB954"
            style={{ marginVertical: 10 }}
          />
        )}

        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 150 }}
          extraData={addedTrackIds}
          renderItem={({ item }) => {
            const isTrackPlaying = currentTrack?.id === item.id && isPlaying;

            return (
              <Swipeable
                ref={(ref) => {
                  if (ref && item.id) rowRefs.current.set(item.id, ref);
                }}
                renderRightActions={(p, d) => renderRightActions(p, d, item)}
                overshootRight={false}
              >
                <TouchableOpacity
                  style={[
                    styles.trackItem,
                    isTrackPlaying && { backgroundColor: "#333" },
                  ]}
                  onPress={() => playTrack(item)}
                  activeOpacity={1}
                >
                  <Image
                    source={{ uri: item.album.images[0]?.url }}
                    style={styles.trackImg}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.trackName,
                        isTrackPlaying && { color: "#1DB954" },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {item.artists[0].name}
                    </Text>
                  </View>
                  <Ionicons
                    name={isTrackPlaying ? "pause" : "play"}
                    size={20}
                    color={isTrackPlaying ? "#1DB954" : "#444"}
                  />
                </TouchableOpacity>
              </Swipeable>
            );
          }}
        />

        {/* Modal Playlist */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Add to Playlist</Text>
              {adding ? (
                <ActivityIndicator
                  size="large"
                  color="#1DB954"
                  style={{ margin: 20 }}
                />
              ) : myPlaylists.length === 0 ? (
                <Text style={{ color: "gray", margin: 20 }}>
                  You don't have any playlists.
                </Text>
              ) : (
                <FlatList
                  data={myPlaylists}
                  keyExtractor={(item) => item.id}
                  style={{ width: "100%", maxHeight: 300 }}
                  renderItem={({ item }) => {
                    const hasSong = playlistsContainingTrack.has(item.id);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.playlistOption,
                          hasSong && {
                            opacity: 0.5,
                            backgroundColor: "#2a2a2a",
                          },
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
                              hasSong && { color: "#888" },
                            ]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          {hasSong && (
                            <Text
                              style={{
                                color: "#1DB954",
                                fontSize: 12,
                                fontWeight: "bold",
                              }}
                            >
                              Already added
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => !adding && setModalVisible(false)}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Close
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
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
    paddingTop: 50,
  },
  title: { color: "white", fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  searchBox: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    marginTop: 10,
  },
  artistItem: { alignItems: "center", marginRight: 20, width: 90 },
  artistImg: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  artistName: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#121212",
    height: 75,
    borderBottomWidth: 0.5,
    borderBottomColor: "#222",
  },
  trackImg: { width: 55, height: 55, borderRadius: 4, marginRight: 15 },
  trackName: { color: "white", fontWeight: "bold", fontSize: 16 },
  sub: { color: "#b3b3b3", fontSize: 14, marginTop: 2 },
  rectBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  rectBtnText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },
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
});
