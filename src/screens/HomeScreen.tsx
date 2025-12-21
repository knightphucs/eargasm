import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";

import { useMusic } from "../context/MusicContext";
import { useSpotifyAuth } from "../context/SpotifyAuthContext";
import { getUserTopTracks } from "../services/spotifyService";

export default function HomeScreen() {
  const [tracks, setTracks] = useState<any[]>([]);

  const { playTrack, currentTrack, isPlaying } = useMusic();

  const { token, loading, userProfile, connectSpotify, logoutSpotify } =
    useSpotifyAuth();

  useEffect(() => {
    if (!token || !auth.currentUser) return;
    loadTracks();
  }, [token]);

  const loadTracks = async () => {
    try {
      const data = await getUserTopTracks(token!);
      setTracks(data.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất không?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            await logoutSpotify();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderHeader = () =>
    userProfile ? (
      <View style={{ marginBottom: 20 }}>
        {/* User Info */}
        <View style={styles.header}>
          {userProfile.images?.[0] ? (
            <Image
              source={{ uri: userProfile.images[0].url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: "#777" }]} />
          )}
          <View>
            <Text style={styles.greeting}>Hi, {userProfile.display_name}</Text>
            <Text style={styles.subTitle}>Your top songs</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#1DB954" />
      ) : (
        <>
          {!token && (
            <View style={styles.center}>
              <Button title="Connect Spotify" onPress={connectSpotify} />
            </View>
          )}
          {token && (
            <FlatList
              data={tracks}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={{
                padding: 20,
                paddingTop: 50,
                paddingBottom: 150,
              }}
              renderItem={({ item }) => {
                const isTrackPlaying =
                  currentTrack?.id === item.id && isPlaying;

                return (
                  <TouchableOpacity
                    style={[
                      styles.trackItem,
                      isTrackPlaying && { backgroundColor: "#282828" },
                    ]}
                    onPress={() => playTrack(item, tracks)}
                  >
                    {/* Album Art */}
                    <Image
                      source={{
                        uri:
                          item.album?.images?.[0]?.url || item.images?.[0]?.url,
                      }}
                      style={styles.albumArt}
                    />

                    {/* Track Info */}
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
                      <Text style={styles.artistName}>
                        {item.artists.map((a: any) => a.name).join(", ")}
                      </Text>
                    </View>

                    {/* Play/Pause Icon */}
                    <Ionicons
                      name={isTrackPlaying ? "pause-circle" : "play-circle"}
                      size={32}
                      color={isTrackPlaying ? "#1DB954" : "white"}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  greeting: { color: "white", fontSize: 20, fontWeight: "bold" },
  subTitle: { color: "gray", fontSize: 14 },
  trackItem: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
  },
  albumArt: { width: 60, height: 60, borderRadius: 4, marginRight: 15 },
  trackName: { color: "white", fontSize: 16, fontWeight: "600" },
  artistName: { color: "#b3b3b3", fontSize: 14, marginTop: 4 },

  logoutBtn: {
    backgroundColor: "#333",
    padding: 8,
    borderRadius: 5,
    alignSelf: "flex-start",
    marginTop: 5,
  },
  logoutText: {
    color: "#ff4444",
    fontSize: 12,
    fontWeight: "bold",
  },
});
