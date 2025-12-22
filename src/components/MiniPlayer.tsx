import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useMusic } from "../context/MusicContext";
import { QueueModal } from "./QueueModal";
import { Image as ExpoImage } from "expo-image";
import { db, auth } from "../config/firebaseConfig";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 50;

// Gradient color themes
const GRADIENT_THEMES = [
  ["#1DB954", "#1ed760"], // Spotify Green
  ["#E91E63", "#F48FB1"], // Pink
  ["#9C27B0", "#BA68C8"], // Purple
  ["#3F51B5", "#7986CB"], // Indigo
  ["#2196F3", "#64B5F6"], // Blue
  ["#00BCD4", "#4DD0E1"], // Cyan
  ["#009688", "#4DB6AC"], // Teal
  ["#FF5722", "#FF8A65"], // Deep Orange
  ["#FF9800", "#FFB74D"], // Orange
  ["#FFC107", "#FFD54F"], // Amber
];

// Hash function to pick gradient based on track ID
const getGradientForTrack = (trackId?: string): string[] => {
  if (!trackId) return GRADIENT_THEMES[0];
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = (hash << 5) - hash + trackId.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % GRADIENT_THEMES.length;
  return GRADIENT_THEMES[index];
};

export default function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    closePlayer,
    expandPlayer,
    playNext,
    playPrevious,
    position,
    duration,
    queue,
    removeFromQueue,
  } = useMusic();

  const [queueVisible, setQueueVisible] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [gradientColors, setGradientColors] = useState<string[]>(
    GRADIENT_THEMES[0]
  );

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  // Animation xuất hiện
  const entranceAnim = useRef(new Animated.Value(150)).current;

  // Animation di chuyển (Pan)
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Animation Scale (Hiệu ứng phồng lên khi chạm)
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Double tap for like
  const lastTap = useRef<number>(0);

  const isPlayerVisible = useRef(false);

  // Kết hợp Scale
  const animatedScale = Animated.multiply(
    scaleAnim,
    pan.y.interpolate({
      inputRange: [-200, 0],
      outputRange: [1.02, 1],
      extrapolate: "clamp",
    })
  );

  const opacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [0.5, 1, 0.5],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const horizontalSwipe =
          Math.abs(gestureState.dx) > 15 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        const verticalSwipe = Math.abs(gestureState.dy) > 20;
        return horizontalSwipe || verticalSwipe;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        // Capture horizontal swipes immediately
        return (
          Math.abs(gestureState.dx) > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2
        );
      },

      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }).start();

        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },

      onPanResponderMove: (_, gestureState) => {
        // Ưu tiên horizontal swipe cho next/previous track
        if (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 20
        ) {
          pan.setValue({ x: gestureState.dx, y: 0 });
        } else if (Math.abs(gestureState.dy) > 20) {
          const newY =
            gestureState.dy < 0 ? gestureState.dy : gestureState.dy * 0.3;
          pan.setValue({ x: 0, y: newY });
        }
      },

      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const { dx, dy, vy } = gestureState;

        if (__DEV__) {
          console.log("🎯 Swipe detected - dx:", dx, "dy:", dy);
          console.log("🎯 Thresholds - SWIPE:", SWIPE_THRESHOLD, "min dx:", 40);
        }

        // Vuốt ngang (ưu tiên cao hơn)
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
          if (__DEV__) console.log("✅ Horizontal swipe confirmed");

          if (dx < -SWIPE_THRESHOLD) {
            // Swipe left (vuốt từ phải qua trái) = previous track
            if (__DEV__) console.log("👈 Swipe left: Previous track");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            playPrevious();
            setTimeout(() => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            }, 200);
            resetPosition();
          } else if (dx > SWIPE_THRESHOLD) {
            // Swipe right (vuốt từ trái qua phải) = next track
            if (__DEV__) console.log("👉 Swipe right: Next track");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            playNext();
            setTimeout(() => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            }, 200);
            resetPosition();
          } else {
            resetPosition();
          }
        }
        // Vuốt dọc hoặc Tap
        else {
          const isTap = Math.abs(dx) < 5 && Math.abs(dy) < 5;
          const isSwipeUp = dy < -SWIPE_THRESHOLD || (dy < -30 && vy < -0.5);

          if (isTap || isSwipeUp) {
            expandPlayer();
            Animated.parallel([
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                friction: 8,
                tension: 70,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 180,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]).start();
          } else {
            resetPosition();
          }
        }
      },
    })
  ).current;

  const resetPosition = () => {
    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        friction: 10,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 9,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (currentTrack) {
      if (!isPlayerVisible.current) {
        Animated.spring(entranceAnim, {
          toValue: 0,
          friction: 9,
          tension: 60,
          useNativeDriver: true,
        }).start();
        isPlayerVisible.current = true;
      }
    } else {
      Animated.timing(entranceAnim, {
        toValue: 150,
        duration: 250,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }).start();
      isPlayerVisible.current = false;
    }
  }, [currentTrack]);

  // Update gradient colors when track changes
  useEffect(() => {
    if (currentTrack?.id) {
      const newColors = getGradientForTrack(currentTrack.id);
      setGradientColors(newColors);
    }
  }, [currentTrack?.id]);

  // Check if track is liked
  useEffect(() => {
    const checkLikedStatus = async () => {
      if (!currentTrack) {
        setIsLiked(false);
        return;
      }

      if (!auth.currentUser) {
        if (__DEV__)
          console.log("⚠️ Cannot check liked status: user not authenticated");
        setIsLiked(false);
        return;
      }

      try {
        const likedRef = doc(
          db,
          "users",
          auth.currentUser.uid,
          "liked_songs",
          currentTrack.id
        );
        const likedDoc = await getDoc(likedRef);
        setIsLiked(likedDoc.exists());
      } catch (error: any) {
        // Silently handle Firebase permission errors
        if (__DEV__) {
          if (error?.code === "permission-denied") {
            console.log(
              "⚠️ Firebase permissions issue - liked check failed (non-critical)"
            );
          } else {
            console.error("Error checking liked status:", error);
          }
        }
        setIsLiked(false);
      }
    };
    checkLikedStatus();
  }, [currentTrack]);

  const handleDoubleTapImage = async () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      lastTap.current = 0;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        const user = auth.currentUser;
        if (!user || !currentTrack) return;

        const likedRef = doc(
          db,
          "users",
          user.uid,
          "liked_songs",
          currentTrack.id
        );

        if (isLiked) {
          await deleteDoc(likedRef);
          setIsLiked(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          await setDoc(likedRef, {
            trackId: currentTrack.id,
            name: currentTrack.name,
            artists: currentTrack.artists,
            album: currentTrack.album,
            uri: currentTrack.uri,
            likedAt: new Date().toISOString(),
          });
          setIsLiked(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        if (__DEV__) console.error("Error toggling like:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      lastTap.current = now;
    }
  };

  if (!currentTrack) return null;

  return (
    <>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          {
            opacity: opacity,
            transform: [
              { translateY: entranceAnim },
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: animatedScale },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[gradientColors[0], gradientColors[1], "#1a1a1a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientOverlay}
        />

        <View style={styles.content}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleDoubleTapImage}
            onLongPress={expandPlayer}
            style={{ position: "relative" }}
          >
            <ExpoImage
              source={{
                uri:
                  currentTrack.album?.images[0]?.url ||
                  "https://via.placeholder.com/50",
              }}
              style={styles.img}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            {/* Liked Indicator */}
            {isLiked && (
              <View style={styles.miniLikedIndicator}>
                <Ionicons name="heart" size={12} color="#E91E63" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.name}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentTrack.artists[0]?.name}
            </Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                playPrevious();
              }}
              style={styles.controlBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="play-skip-back" size={22} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => playTrack(currentTrack, queue)}
              style={styles.playBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={28}
                color="white"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                playNext();
              }}
              style={styles.controlBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="play-skip-forward" size={22} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setQueueVisible(true);
              }}
              style={styles.controlBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="list" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                closePlayer();
              }}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#bbb" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </View>
      </Animated.View>

      <QueueModal
        visible={queueVisible}
        queue={queue}
        currentTrackId={currentTrack?.id}
        onClose={() => setQueueVisible(false)}
        onTrackSelect={(track) => {
          playTrack(track, queue);
          setQueueVisible(false);
        }}
        onRemoveTrack={(trackId) => {
          removeFromQueue(trackId);
        }}
      />
    </>
  );
}

// FULL STYLES ĐỂ KHÔNG BỊ LỖI
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    overflow: "hidden",
    zIndex: 9999,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.9,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 64,
    gap: 12,
  },
  img: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: "#333",
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "400",
    marginBottom: 4,
  },
  artist: {
    color: "#B3B3B3",
    fontSize: 12,
    fontWeight: "400",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  controlBtn: {
    padding: 6,
  },
  playBtn: {
    padding: 4,
    marginHorizontal: 4,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  progressContainer: {
    width: "100%",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressBackground: {
    height: 2,
    width: "100%",
    backgroundColor: "#404040",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#B3B3B3",
  },
  miniLikedIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    padding: 3,
  },
});
