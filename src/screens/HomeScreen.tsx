import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  ViewToken,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Contexts
import { useMusic } from "../context/MusicContext";
import { useSpotifyAuth } from "../context/SpotifyAuthContext";
import { useUser } from "../context/UserContext";
import { getUserTopTracks } from "../services/spotifyService";
import {
  SkeletonAlbumCard,
  SkeletonTrackItem,
} from "../components/SkeletonLoader";

const { width } = Dimensions.get("window");
const BANNER_WIDTH = width;
const BANNER_HEIGHT = 280;

// --- INTERFACES ---
interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  images?: { url: string }[];
}

interface BannerProps {
  data: Track[];
  onPlay: (item: Track) => void;
}

interface CircleArtistProps {
  item: Track;
  onPress: () => void;
}

// --- COMPONENT: AUTO SCROLLING BANNER ---
const AutoScrollingBanner = ({ data, onPlay }: BannerProps) => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!data || data.length === 0) return;

    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= data.length) {
        nextIndex = 0;
      }

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }, 4000);

    return () => clearInterval(interval);
  }, [currentIndex, data]);

  // Fix lỗi Type cho viewableItems
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  if (!data || data.length === 0) return null;

  const renderBannerItem = ({ item }: { item: Track }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPlay(item);
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 150);
      }}
      style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT }}
    >
      <Image
        source={{ uri: item.album?.images?.[0]?.url || item.images?.[0]?.url }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.95)"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.bannerContent}>
        <View style={styles.tagContainer}>
          <Text style={styles.tagText}>FEATURED TRACK</Text>
        </View>
        <Text style={styles.bannerTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.bannerSubtitle}>{item.artists[0].name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ height: BANNER_HEIGHT }}>
      <FlatList
        ref={flatListRef}
        data={data}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `banner-${item.id}`}
        renderItem={renderBannerItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
      />
      {/* Dots Indicator */}
      <View style={styles.paginationDotContainer}>
        {data.map((_: any, i: number) => {
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          });
          return <Animated.View key={i} style={[styles.dot, { opacity }]} />;
        })}
      </View>
    </View>
  );
};

// --- COMPONENT: HORIZONTAL CIRCLE LIST ---
const CircleArtistItem = React.memo(({ item, onPress }: CircleArtistProps) => (
  <TouchableOpacity
    style={{ alignItems: "center", marginRight: 20 }}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Image
      source={{ uri: item.album?.images?.[0]?.url }}
      style={{
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: "#1DB954",
      }}
      cachePolicy="memory-disk"
    />
    <Text
      style={{
        color: "#ccc",
        fontSize: 11,
        marginTop: 5,
        width: 70,
        textAlign: "center",
      }}
      numberOfLines={1}
    >
      {item.artists[0].name}
    </Text>
  </TouchableOpacity>
));

// --- MAIN SCREEN ---
export default function HomeScreen() {
  const {
    token,
    loading: authLoading,
    userProfile: spotifyProfile,
    connectSpotify,
    logoutSpotify,
  } = useSpotifyAuth();

  const { userProfile: firestoreUser } = useUser();
  const { playTrack, currentTrack, isPlaying } = useMusic();
  const navigation = useNavigation<any>();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  const trendingScrollX = useRef(0);
  const trendingRef = useRef<FlatList>(null);
  const isUserInteracting = useRef(false);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const currentOffset = useRef(0);

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good Morning";
    if (hours < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const displayAvatar =
    firestoreUser?.avatarUrl || spotifyProfile?.images?.[0]?.url;
  // Fallback avatar nếu không có ảnh
  const avatarSource = displayAvatar
    ? { uri: displayAvatar }
    : require("../../assets/avatar.png");

  const displayName =
    firestoreUser?.displayName || spotifyProfile?.display_name || "User";

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const loadData = async () => {
    // Fix: Kiểm tra token trước khi gọi service để tránh lỗi null
    if (!token) return;

    setLoading(true);
    try {
      const data = await getUserTopTracks(token);
      setTracks(data.items || []);
    } catch (e) {
      if (__DEV__) console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const bannerData = tracks.slice(0, 5);
  const artistData = tracks.slice(5, 12);
  const listData = tracks.slice(0, 8);

  const CARD_WIDTH = 155; // 140 + margin
  const loopingData = [...listData, ...listData];

  const onTrendingScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    currentOffset.current = offsetX;

    const singleListWidth = CARD_WIDTH * listData.length;

    // Khi scroll sang nửa sau → nhảy về nửa đầu (vô hình)
    if (offsetX >= singleListWidth) {
      trendingRef.current?.scrollToOffset({
        offset: offsetX - singleListWidth,
        animated: false,
      });
      currentOffset.current = offsetX - singleListWidth;
    }
  };

  const startAutoScroll = () => {
    stopAutoScroll();

    autoScrollTimer.current = setInterval(() => {
      if (isUserInteracting.current) return;

      trendingRef.current?.scrollToOffset({
        offset: currentOffset.current + 0.4, // 👈 mượt
        animated: false,
      });
    }, 16);
  };

  const stopAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  };

  const onTouchStart = () => {
    isUserInteracting.current = true;
    stopAutoScroll();
  };

  const onTouchEnd = () => {
    isUserInteracting.current = false;
    setTimeout(startAutoScroll, 2000); // ⏱ resume sau 2s
  };

  useEffect(() => {
    if (listData.length > 0) {
      startAutoScroll();
    }

    return () => stopAutoScroll();
  }, [listData]);

  if (!token) {
    return (
      <View style={styles.centerContainer}>
        <TouchableOpacity style={styles.loginBtn} onPress={connectSpotify}>
          <Text style={styles.btnText}>Login Spotify</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fix: StatusBar props correct */}
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 0 }} // Remove top padding because banner is translucent
        showsVerticalScrollIndicator={false}
      >
        {/* 1. AUTO SCROLLING HEADER */}
        {loading ? (
          <View
            style={{
              height: 280,
              justifyContent: "center",
              backgroundColor: "#1E1E1E",
            }}
          >
            <View style={{ paddingHorizontal: 20 }}>
              <SkeletonAlbumCard />
            </View>
          </View>
        ) : (
          <AutoScrollingBanner
            data={bannerData}
            onPlay={(item) => playTrack(item, tracks)}
          />
        )}

        {/* Header Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingTitle}>Discover</Text>
          <View>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.userNameText} numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate("UserProfile")}>
            <Image
              source={avatarSource}
              style={styles.avatar}
              contentFit="cover"
            />
          </TouchableOpacity>
        </View>

        {/* 2. ARTIST / CIRCLE LIST */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Top Artists</Text>
          <FlatList
            horizontal
            data={artistData}
            keyExtractor={(item) => `artist-${item.id}`}
            renderItem={({ item }) => (
              <CircleArtistItem
                item={item}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  playTrack(item, tracks);
                  setTimeout(() => {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success
                    );
                  }, 150);
                }}
              />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20 }}
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            windowSize={5}
            initialNumToRender={5}
          />
        </View>

        {/* 3. TRENDING / RECENT (Cards) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Trending Now</Text>
          {loading ? (
            <FlatList
              horizontal
              data={[1, 2, 3]}
              keyExtractor={(item) => `skeleton-${item}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20 }}
              renderItem={() => <SkeletonAlbumCard />}
            />
          ) : (
            <FlatList
              ref={trendingRef}
              horizontal
              data={listData}
              keyExtractor={(item) => `trend-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cardItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    playTrack(item, tracks);
                  }}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.album?.images?.[0]?.url }}
                    style={styles.cardImage}
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              scrollEventThrottle={16}
              onScroll={onTrendingScroll}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              removeClippedSubviews={true}
              maxToRenderPerBatch={3}
              windowSize={3}
              initialNumToRender={3}
              getItemLayout={(data, index) => ({
                length: 140,
                offset: 140 * index,
                index,
              })}
            />
          )}
        </View>

        {/* 4. VERTICAL LIST */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingRight: 20,
              alignItems: "center",
            }}
          >
            <Text style={styles.sectionHeader}>On Your Heavy Rotation</Text>
            <TouchableOpacity onPress={logoutSpotify}>
              <Text style={{ color: "#1DB954", fontSize: 12 }}>Logout</Text>
            </TouchableOpacity>
          </View>

          {listData.map((item, index) => {
            const isTrackPlaying = currentTrack?.id === item.id && isPlaying;
            return (
              <TouchableOpacity
                key={`list-${item.id}-${index}`}
                style={styles.rowItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  playTrack(item, tracks);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.indexText}>{index + 1}</Text>
                <Image
                  source={{ uri: item.album?.images?.[0]?.url }}
                  style={styles.rowImage}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.rowTitle,
                      isTrackPlaying && { color: "#1DB954" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.rowSubTitle}>{item.artists[0].name}</Text>
                </View>
                <Ionicons
                  name="play-circle"
                  size={24}
                  color={isTrackPlaying ? "#1DB954" : "#444"}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },

  // Login
  loginBtn: {
    backgroundColor: "#1DB954",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  btnText: { color: "black", fontWeight: "bold" },

  // --- Banner Styles ---
  bannerContent: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
  },
  tagContainer: {
    backgroundColor: "#1DB954",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  tagText: { fontSize: 10, fontWeight: "bold", color: "black" },
  bannerTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "capitalize",
  },
  bannerSubtitle: {
    color: "#ddd",
    fontSize: 16,
    marginTop: 4,
    fontWeight: "500",
  },

  // Dots
  paginationDotContainer: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
    marginHorizontal: 4,
  },

  // --- Greeting ---
  greetingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  greetingTitle: { color: "white", fontSize: 32, fontWeight: "bold" },
  greetingText: {
    color: "#b3b3b3", // Màu xám nhạt cho câu chào
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  userNameText: {
    color: "white",
    fontSize: 24, // Tên to rõ ràng
    fontWeight: "bold",
    marginTop: 2,
    maxWidth: 250, // Giới hạn chiều rộng để không đè lên avatar
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#1DB954", // Viền xanh Spotify cho nổi bật
  },

  // --- Sections ---
  section: { marginTop: 25 },
  sectionHeader: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    paddingLeft: 20,
    marginBottom: 15,
  },

  // Card Item
  cardItem: { marginRight: 15, width: 140 },
  cardImage: { width: 140, height: 140, borderRadius: 12, marginBottom: 8 },
  cardTitle: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Row Item
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  indexText: { color: "#555", fontSize: 16, width: 30, fontWeight: "bold" },
  rowImage: { width: 50, height: 50, borderRadius: 8, marginRight: 15 },
  rowTitle: { color: "white", fontSize: 15, fontWeight: "600" },
  rowSubTitle: { color: "#888", fontSize: 13, marginTop: 2 },
});
