// src/components/SkeletonLoader.tsx
import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader = ({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonLoaderProps) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View
      style={[
        styles.container,
        { width: width as any, height, borderRadius },
        style,
      ]}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
      >
        <LinearGradient
          colors={["#282828", "#383838", "#282828"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// Skeleton cho Album Card
export const SkeletonAlbumCard = () => (
  <View style={styles.albumCard}>
    <SkeletonLoader width={160} height={160} borderRadius={8} />
    <SkeletonLoader
      width={140}
      height={16}
      style={styles.albumTitle}
      borderRadius={4}
    />
    <SkeletonLoader width={100} height={12} borderRadius={4} />
  </View>
);

// Skeleton cho Track Item
export const SkeletonTrackItem = () => (
  <View style={styles.trackItem}>
    <SkeletonLoader width={50} height={50} borderRadius={4} />
    <View style={styles.trackInfo}>
      <SkeletonLoader width="80%" height={14} borderRadius={4} />
      <SkeletonLoader
        width="60%"
        height={12}
        style={{ marginTop: 6 }}
        borderRadius={4}
      />
    </View>
  </View>
);

// Skeleton cho Playlist Card
export const SkeletonPlaylistCard = () => (
  <View style={styles.playlistCard}>
    <SkeletonLoader width={120} height={120} borderRadius={8} />
    <View style={styles.playlistInfo}>
      <SkeletonLoader width={100} height={14} borderRadius={4} />
      <SkeletonLoader
        width={60}
        height={12}
        style={{ marginTop: 6 }}
        borderRadius={4}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#282828",
    overflow: "hidden",
  },
  albumCard: {
    width: 160,
    marginRight: 12,
  },
  albumTitle: {
    marginTop: 8,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  trackInfo: {
    flex: 1,
  },
  playlistCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    marginBottom: 8,
  },
  playlistInfo: {
    flex: 1,
  },
});
