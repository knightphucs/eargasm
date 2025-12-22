import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface NowPlayingIndicatorProps {
  isPlaying: boolean;
  size?: number;
  color?: string;
}

export const NowPlayingIndicator = ({
  isPlaying,
  size = 16,
  color = "#1DB954",
}: NowPlayingIndicatorProps) => {
  const bar1Anim = useRef(new Animated.Value(0)).current;
  const bar2Anim = useRef(new Animated.Value(0)).current;
  const bar3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPlaying) {
      // Reset animations
      bar1Anim.setValue(0);
      bar2Anim.setValue(0);
      bar3Anim.setValue(0);
      return;
    }

    // Looping animation for playing state
    const animateBar = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: false,
          }),
        ])
      );
    };

    const animations = [
      animateBar(bar1Anim, 0),
      animateBar(bar2Anim, 150),
      animateBar(bar3Anim, 300),
    ];

    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [isPlaying, bar1Anim, bar2Anim, bar3Anim]);

  const barHeight1 = bar1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 16],
  });

  const barHeight2 = bar2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 20],
  });

  const barHeight3 = bar3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 12],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.bar, { height: barHeight1, backgroundColor: color }]}
      />
      <Animated.View
        style={[styles.bar, { height: barHeight2, backgroundColor: color }]}
      />
      <Animated.View
        style={[styles.bar, { height: barHeight3, backgroundColor: color }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    justifyContent: "center",
  },
  bar: {
    width: 2,
    borderRadius: 1,
  },
});
