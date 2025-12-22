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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMusic } from "../context/MusicContext";
import { QueueModal } from "./QueueModal";
import { Image as ExpoImage } from "expo-image";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 80;

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
  } = useMusic();

  const [queueVisible, setQueueVisible] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  // Animation xuất hiện
  const entranceAnim = useRef(new Animated.Value(150)).current;

  // Animation di chuyển (Pan)
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Animation Scale (Hiệu ứng phồng lên khi chạm)
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },

      onPanResponderGrant: () => {
        // Player "phồng" lên ngay lập tức
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }).start();

        // FIX LỖI _value: Ép kiểu as any để lấy giá trị hiện tại
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },

      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
          pan.setValue({ x: gestureState.dx, y: 0 });
        } else {
          const newY =
            gestureState.dy < 0 ? gestureState.dy : gestureState.dy * 0.3;
          pan.setValue({ x: 0, y: newY });
        }
      },

      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const { dx, dy, vy } = gestureState;

        // Vuốt ngang
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx < -SWIPE_THRESHOLD) {
            playNext();
            resetPosition();
          } else if (dx > SWIPE_THRESHOLD) {
            playPrevious();
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
            // Reset nhẹ nhàng
            Animated.parallel([
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 200,
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
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (currentTrack) {
      if (!isPlayerVisible.current) {
        Animated.spring(entranceAnim, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }).start();
        isPlayerVisible.current = true;
      }
    } else {
      Animated.timing(entranceAnim, {
        toValue: 150,
        duration: 300,
        useNativeDriver: true,
      }).start();
      isPlayerVisible.current = false;
    }
  }, [currentTrack]);

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
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </View>

        <View style={styles.content}>
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
              onPress={playPrevious}
              style={styles.controlBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="play-skip-back" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => playTrack(currentTrack)}
              style={styles.playBtn}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPlaying ? "pause-circle" : "play-circle"}
                size={40}
                color="white"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={playNext}
              style={styles.controlBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="play-skip-forward" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setQueueVisible(true)}
              style={styles.controlBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="list" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity onPress={closePlayer} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#bbb" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <QueueModal
        visible={queueVisible}
        queue={queue}
        currentTrackId={currentTrack?.id}
        onClose={() => setQueueVisible(false)}
        onTrackSelect={(track) => {
          playTrack(track);
          setQueueVisible(false);
        }}
        onRemoveTrack={(trackId) => {
          setQueue(queue.filter((t) => t.id !== trackId));
        }}
      />
    </>
  );
}

// FULL STYLES ĐỂ KHÔNG BỊ LỖI
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 78,
    left: 10,
    right: 10,
    backgroundColor: "#202020",
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    height: 64,
  },
  img: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: "#333",
  },
  info: {
    flex: 1,
    marginLeft: 10,
    justifyContent: "center",
    marginRight: 5,
  },
  title: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  artist: {
    color: "#b3b3b3",
    fontSize: 11,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
  },
  controlBtn: {
    padding: 5,
  },
  playBtn: {
    marginHorizontal: 5,
  },
  closeBtn: {
    marginLeft: 5,
    padding: 5,
  },
  progressContainer: {
    width: "100%",
    position: "absolute",
    top: -1,
    left: 0,
    right: 0,
    zIndex: 10,
    opacity: 0.8,
  },
  progressBackground: {
    height: 2,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#1DB954",
  },
});
