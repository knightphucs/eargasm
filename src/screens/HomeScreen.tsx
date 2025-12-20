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
import * as WebBrowser from "expo-web-browser";
import { useAuthRequest, ResponseType } from "expo-auth-session";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";

import { SPOTIFY_CONFIG } from "../config/spotifyConfig";
import {
  exchangeCodeForToken,
  getUserProfile,
  getUserTopTracks,
  saveToken,
  getSavedToken,
} from "../services/spotifyService";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useMusic } from "../context/MusicContext";

WebBrowser.maybeCompleteAuthSession();

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);

  const { playTrack, currentTrack, isPlaying } = useMusic();

  const [request, response, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.Code,
      clientId: SPOTIFY_CONFIG.clientId,
      scopes: SPOTIFY_CONFIG.scopes,
      usePKCE: true,
      redirectUri: SPOTIFY_CONFIG.redirectUri,
    },
    SPOTIFY_CONFIG.discovery
  );

  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;
      handleExchangeToken(code);
    }
  }, [response]);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    setLoading(true);
    const savedToken = await getSavedToken();

    if (savedToken) {
      console.log("⚡ Auto Login with saved Token");
      setToken(savedToken);
      loadData(savedToken);
    }
    setLoading(false);
  };

  const loadData = async (accessToken: string) => {
    try {
      const [profileData, tracksData] = await Promise.all([
        getUserProfile(accessToken),
        getUserTopTracks(accessToken),
      ]);
      setUserProfile(profileData);
      setTracks(tracksData.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExchangeToken = async (code: string) => {
    setLoading(true);
    try {
      const tokenResult = await exchangeCodeForToken(
        code,
        request?.codeVerifier || ""
      );
      const { access_token, expires_in } = tokenResult;

      setToken(access_token);
      await saveToken(access_token, expires_in);

      if (auth.currentUser) {
        setDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            spotify: { isConnected: true, accessToken: access_token },
          },
          { merge: true }
        );
      }

      loadData(access_token);
    } catch (error: any) {
      Alert.alert("Error", error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const logoutSpotify = async () => {
    Alert.alert("Log out", "Are you sure to log out app?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "OK",
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            setToken(null);
            setUserProfile(null);
            setTracks([]);
            await signOut(auth);
            console.log("Logged out successfully!");
          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
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

        <TouchableOpacity onPress={logoutSpotify} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#1DB954" />
      ) : !token ? (
        <View style={styles.center}>
          <Button
            disabled={!request}
            title="Connect Spotify"
            onPress={() => promptAsync()}
          />
        </View>
      ) : (
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
            const isTrackPlaying = currentTrack?.id === item.id && isPlaying;

            return (
              <TouchableOpacity
                style={[
                  styles.trackItem,
                  isTrackPlaying && { backgroundColor: "#282828" },
                ]}
                onPress={() => playTrack(item)}
              >
                {/* Album Art */}
                <Image
                  source={{
                    uri: item.album?.images?.[0]?.url || item.images?.[0]?.url,
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
