import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
}

interface GestureTrackCardProps {
  track: Track;
  onPlay: () => void;
  onAddToQueue?: () => void;
  onLike?: () => void;
  isLiked?: boolean;
}

export default function GestureTrackCard({
  track,
  onPlay,
  onAddToQueue,
  onLike,
  isLiked = false,
}: GestureTrackCardProps) {
  const { colors } = useTheme();
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [showActions, setShowActions] = useState(false);

  // Long press timer
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.spring(scale, {
          toValue: 1.05,
          useNativeDriver: true,
        }).start();

        // Start long press timer
        longPressTimer.current = setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowActions(true);
        }, 500);
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 20 && longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(_, gestureState);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        // Swipe right - Add to queue
        if (gestureState.dx > 100) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onAddToQueue?.();
          Animated.spring(pan, {
            toValue: { x: 300, y: 0 },
            useNativeDriver: false,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
          });
        }
        // Swipe left - Like/Unlike
        else if (gestureState.dx < -100) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onLike?.();
          Animated.sequence([
            Animated.spring(pan, {
              toValue: { x: -300, y: 0 },
              useNativeDriver: false,
            }),
            Animated.timing(pan, {
              toValue: { x: 0, y: 0 },
              duration: 0,
              useNativeDriver: false,
            }),
          ]).start();
        }
        // Return to original position
        else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }

        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const rotate = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  const leftActionOpacity = pan.x.interpolate({
    inputRange: [-100, -50, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  const rightActionOpacity = pan.x.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0.5, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      {/* Left Action - Like */}
      <Animated.View
        style={[
          styles.actionLeft,
          { backgroundColor: "#E91E63", opacity: leftActionOpacity },
        ]}
      >
        <Ionicons name="heart" size={28} color="white" />
      </Animated.View>

      {/* Right Action - Add to Queue */}
      <Animated.View
        style={[
          styles.actionRight,
          { backgroundColor: "#1DB954", opacity: rightActionOpacity },
        ]}
      >
        <Ionicons name="list" size={28} color="white" />
      </Animated.View>

      {/* Main Card */}
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: colors.surface },
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { rotate },
              { scale },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={onPlay}
          activeOpacity={0.9}
          style={styles.cardContent}
        >
          <Image
            source={{ uri: track.album.images[0]?.url }}
            style={styles.image}
            contentFit="cover"
          />
          <View style={styles.info}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {track.name}
            </Text>
            <Text
              style={[styles.artist, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {track.artists[0].name}
            </Text>
          </View>
          {isLiked && (
            <Ionicons
              name="heart"
              size={20}
              color="#E91E63"
              style={styles.likeIcon}
            />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Action Menu (Long Press) */}
      {showActions && (
        <View style={[styles.actionMenu, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowActions(false);
              onPlay();
            }}
          >
            <Ionicons name="play" size={20} color={colors.text} />
            <Text style={[styles.menuText, { color: colors.text }]}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowActions(false);
              onAddToQueue?.();
            }}
          >
            <Ionicons name="list" size={20} color={colors.text} />
            <Text style={[styles.menuText, { color: colors.text }]}>
              Add to Queue
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowActions(false);
              onLike?.();
            }}
          >
            <Ionicons name="heart" size={20} color="#E91E63" />
            <Text style={[styles.menuText, { color: colors.text }]}>
              {isLiked ? "Unlike" : "Like"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowActions(false)}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
            <Text style={[styles.menuText, { color: colors.textSecondary }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hint overlay */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>← Swipe to like | Add to queue →</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 80,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  actionLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  actionRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  artist: {
    fontSize: 14,
    marginTop: 4,
  },
  likeIcon: {
    marginLeft: 8,
  },
  actionMenu: {
    position: "absolute",
    top: 0,
    right: 0,
    borderRadius: 12,
    padding: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  hintContainer: {
    position: "absolute",
    bottom: -20,
    alignSelf: "center",
  },
  hintText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "500",
  },
});
