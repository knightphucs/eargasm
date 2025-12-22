// src/components/AudioVisualizer.tsx
import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Easing } from "react-native";

interface AudioVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  barWidth?: number;
  barGap?: number;
  color?: string;
}

export const AudioVisualizer = ({
  isPlaying,
  barCount = 40,
  barWidth = 3,
  barGap = 2,
  color = "#1DB954",
}: AudioVisualizerProps) => {
  const animatedValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.2))
  ).current;

  useEffect(() => {
    if (isPlaying) {
      const animations = animatedValues.map((anim, index) => {
        const delay = index * 30;

        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: Math.random() * 0.8 + 0.2,
              duration: 250 + Math.random() * 300,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
              delay,
            }),
            Animated.timing(anim, {
              toValue: Math.random() * 0.3 + 0.1,
              duration: 250 + Math.random() * 300,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
      });

      Animated.parallel(animations).start();
    } else {
      Animated.parallel(
        animatedValues.map((anim) =>
          Animated.timing(anim, {
            toValue: 0.2,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          })
        )
      ).start();
    }
  }, [isPlaying, animatedValues]);

  return (
    <View style={[styles.container, { gap: barGap }]}>
      {animatedValues.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              width: barWidth,
              backgroundColor: color,
              transform: [
                {
                  scaleY: anim,
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

// Visualizer dạng circular (cho album art)
export const CircularVisualizer = ({
  isPlaying,
  size = 200,
  color = "#1DB954",
}: {
  isPlaying: boolean;
  size?: number;
  color?: string;
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [isPlaying, pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.circularContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
  },
  bar: {
    height: "100%",
    borderRadius: 2,
  },
  circularContainer: {
    position: "absolute",
    borderWidth: 3,
    opacity: 0.6,
  },
});
