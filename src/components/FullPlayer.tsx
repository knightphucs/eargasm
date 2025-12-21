import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMusic } from "../context/MusicContext";
import Slider from "@react-native-community/slider";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;
const DISMISS_THRESHOLD = 150;

export default function FullPlayer() {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    collapsePlayer,
    playNext,
    playPrevious,
    position,
    duration,
    seekTo,
  } = useMusic();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const panResponder = useRef(
    PanResponder.create({
      // Cho phép view con (như Slider/Button) nhận sự kiện Touch trước
      onStartShouldSetPanResponder: () => false,

      // Quyết định khi nào thì View cha (FullPlayer) "cướp" sự kiện để xử lý vuốt
      onMoveShouldSetPanResponder: (_, gesture) => {
        const isVerticalSwipe = Math.abs(gesture.dy) > Math.abs(gesture.dx);
        const isSignificantMove = Math.abs(gesture.dy) > 10;

        // CHỈ "cướp" sự kiện nếu:
        // 1. Vuốt dọc nhiều hơn vuốt ngang (để không chặn Slider)
        // 2. Vuốt đủ dài (> 10px)
        return isVerticalSwipe && isSignificantMove;
      },

      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          // Kéo xuống -> Di chuyển view
          translateY.setValue(gesture.dy);
        } else {
          // Kéo lên -> Kháng lực (Rubber banding)
          translateY.setValue(gesture.dy / 3);
        }
      },

      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_THRESHOLD || gesture.vy > 0.6) {
          closeAnim();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const closeAnim = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      collapsePlayer();
    });
  };

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!currentTrack) return null;

  return (
    <Animated.View
      // 👉 THAY ĐỔI QUAN TRỌNG: Gắn panHandlers vào view tổng ngoài cùng
      {...panResponder.panHandlers}
      style={[styles.container, { transform: [{ translateY }] }]}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            onPress={closeAnim}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-down" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NOW PLAYING</Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Artwork */}
        <View style={styles.artworkContainer}>
          <Image
            source={{
              uri:
                currentTrack.album?.images[0]?.url ||
                "https://via.placeholder.com/300",
            }}
            style={styles.cover}
          />
        </View>

        {/* Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.name}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentTrack.artists.map((a: any) => a.name).join(", ")}
          </Text>
        </View>

        {/* Progress: Slider cần nằm trong View không bị chặn bởi PanResponder ngang */}
        <View style={styles.progressContainer}>
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={0}
            maximumValue={duration}
            value={position}
            minimumTrackTintColor="#1DB954"
            maximumTrackTintColor="#555"
            thumbTintColor="#1DB954"
            onSlidingComplete={seekTo}
            // fix lỗi slider trên Android đôi khi bị giật khi nằm trong PanResponder
            onSlidingStart={() => {}}
          />

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={playPrevious}>
            <Ionicons name="play-skip-back" size={35} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => playTrack(currentTrack)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPlaying ? "pause-circle" : "play-circle"}
              size={80}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={playNext}>
            <Ionicons name="play-skip-forward" size={35} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#121212",
    zIndex: 99999,
  },
  headerContainer: {
    paddingTop: 40, // Safe Area Top
    paddingBottom: 10,
    backgroundColor: "transparent",
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 25,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    opacity: 0.7,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingBottom: 50, // Bottom padding
  },
  artworkContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  cover: {
    width: SCREEN_WIDTH - 60,
    height: SCREEN_WIDTH - 60,
    borderRadius: 12,
    backgroundColor: "#333",
  },
  trackInfo: {
    alignItems: "center",
    paddingHorizontal: 30,
    width: "100%",
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  artist: {
    color: "#b3b3b3",
    fontSize: 16,
    textAlign: "center",
  },
  progressContainer: {
    width: "88%",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
    marginTop: -5,
  },
  timeText: {
    color: "#b3b3b3",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "65%",
  },
});
