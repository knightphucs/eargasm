import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image"; // Dùng thư viện ảnh xịn hơn
import { LinearGradient } from "expo-linear-gradient"; // Hiệu ứng nền
import * as WebBrowser from "expo-web-browser";
import { useAuthRequest, ResponseType } from "expo-auth-session";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

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
import { useUser } from "../context/UserContext"; // Import Context User

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");

// Component Skeleton: Hiệu ứng loading dạng khung xương
const SkeletonItem = () => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.trackItem}>
      <Animated.View style={[styles.skeletonBox, { width: 60, height: 60, opacity }]} />
      <View style={{ marginLeft: 15, flex: 1 }}>
        <Animated.View style={[styles.skeletonBox, { width: "70%", height: 16, marginBottom: 8, opacity }]} />
        <Animated.View style={[styles.skeletonBox, { width: "40%", height: 12, opacity }]} />
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [spotifyProfile, setSpotifyProfile] = useState<any>(null); // Đổi tên để tránh nhầm với firestoreUser
  const [tracks, setTracks] = useState<any[]>([]);

  const navigation = useNavigation<any>();
  const { playTrack, currentTrack, isPlaying } = useMusic();
  
  // Lấy dữ liệu user từ Firestore (Realtime update)
  const { userProfile: firestoreUser } = useUser();

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
    } else {
      setLoading(false); // Dừng loading nếu chưa login
    }
  };

  const loadData = async (accessToken: string) => {
    try {
      // Chỉ load data nhạc và profile gốc từ Spotify
      const [profileData, tracksData] = await Promise.all([
        getUserProfile(accessToken),
        getUserTopTracks(accessToken),
      ]);
      setSpotifyProfile(profileData);
      setTracks(tracksData.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeToken = async (code: string) => {
    setLoading(true);
    try {
      const tokenResult = await exchangeCodeForToken(code, request?.codeVerifier || "");
      const { access_token, expires_in } = tokenResult;

      setToken(access_token);
      await saveToken(access_token, expires_in);

      // Cập nhật trạng thái kết nối Spotify vào Firestore
      if (auth.currentUser) {
        setDoc(
          doc(db, "users", auth.currentUser.uid),
          { spotify: { isConnected: true, accessToken: access_token } },
          { merge: true }
        );
      }

      loadData(access_token);
    } catch (error: any) {
      Alert.alert("Error", error.message);
      setLoading(false);
    }
  };

  const logoutSpotify = async () => {
    Alert.alert("Log out", "Are you sure to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            setToken(null);
            setSpotifyProfile(null);
            setTracks([]);
            await signOut(auth);
          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
  };

  // Logic chào hỏi theo giờ
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  };

  const renderHeader = () => {
    // Nếu đang load hoặc chưa có token thì hiện Skeleton Header (hoặc null)
    if (!token) return null;

    // Logic ưu tiên hiển thị: Firestore > Spotify > Default
    const displayAvatar = firestoreUser?.avatarUrl 
      ? firestoreUser.avatarUrl 
      : spotifyProfile?.images?.[0]?.url;

    const displayName = firestoreUser?.displayName || spotifyProfile?.display_name || "User";

    return (
      <View style={styles.headerContainer}>
        {/* Hiệu ứng Gradient mờ phía trên */}
        <LinearGradient
          colors={['rgba(29, 185, 84, 0.3)', 'transparent']}
          style={styles.gradientBackground}
        />

        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.profileSection}
            onPress={() => navigation.navigate("UserProfile")}
          >
            <Image
              source={displayAvatar ? { uri: displayAvatar } : require("../../assets/avatar.png")}
              style={styles.avatar}
              transition={500} // Fade-in effect
              contentFit="cover"
            />
            <View>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.userNameText}>{displayName}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={logoutSpotify}>
            <Ionicons name="log-out-outline" size={24} color="#b3b3b3" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Your Top Mixes</Text>
      </View>
    );
  };

  // Màn hình Login (Chưa có token)
  if (!token) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="musical-notes" size={80} color="#1DB954" style={{ marginBottom: 20 }} />
        <Text style={styles.loginTitle}>Eargasm</Text>
        <Text style={styles.loginSub}>Millions of songs. Free on Eargasm.</Text>
        <TouchableOpacity
          disabled={!request}
          style={styles.loginButton}
          onPress={() => promptAsync()}
        >
          <Text style={styles.loginButtonText}>Connect with Spotify</Text>
        </TouchableOpacity>
        {loading && <ActivityIndicator style={{ marginTop: 20 }} color="#1DB954" />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Danh sách bài hát */}
      <FlatList
        data={loading ? Array(6).fill(0) : tracks} // Nếu loading thì hiện mảng giả để render Skeleton
        keyExtractor={(item, index) => (loading ? index.toString() : item.id)}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 150 }}
        renderItem={({ item }) => {
          if (loading) return <SkeletonItem />; // Render xương rồng

          const isTrackPlaying = currentTrack?.id === item.id && isPlaying;
          
          return (
            <TouchableOpacity
              style={[
                styles.trackItem,
                isTrackPlaying && styles.activeTrackItem,
              ]}
              onPress={() => playTrack(item)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: item.album?.images?.[0]?.url || item.images?.[0]?.url }}
                style={styles.albumArt}
                transition={300}
                contentFit="cover"
              />

              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text
                  style={[
                    styles.trackName,
                    isTrackPlaying && { color: "#1DB954" },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text style={styles.artistName} numberOfLines={1}>
                  {item.artists.map((a: any) => a.name).join(", ")}
                </Text>
              </View>

              <TouchableOpacity onPress={() => {/* Thêm vào playlist logic sau này */}}>
                <Ionicons
                  name={isTrackPlaying ? "stats-chart" : "ellipsis-horizontal"}
                  size={20}
                  color={isTrackPlaying ? "#1DB954" : "#b3b3b3"}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  
  // Login Screen Styles
  centerContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#121212",
    padding: 20 
  },
  loginTitle: { color: "white", fontSize: 40, fontWeight: "bold", marginBottom: 10 },
  loginSub: { color: "gray", fontSize: 16, marginBottom: 40 },
  loginButton: {
    backgroundColor: "#1DB954",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  loginButtonText: { color: "black", fontWeight: "bold", fontSize: 16, textTransform: "uppercase" },

  // Header Styles
  headerContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  greetingText: { color: "#b3b3b3", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  userNameText: { color: "white", fontSize: 18, fontWeight: "bold" },
  sectionTitle: { color: "white", fontSize: 22, fontWeight: "bold", marginBottom: 15 },

  // Track List Styles
  trackItem: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "center",
    padding: 10,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  activeTrackItem: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  albumArt: { width: 56, height: 56, borderRadius: 4, marginRight: 15 },
  trackName: { color: "white", fontSize: 16, fontWeight: "500", marginBottom: 4 },
  artistName: { color: "#b3b3b3", fontSize: 13 },

  // Skeleton Styles
  skeletonBox: {
    backgroundColor: "#333",
    borderRadius: 4,
  }
});