import React from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

interface GlassmorphicCardProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: "light" | "dark";
  style?: any;
}

export function GlassmorphicCard({
  children,
  intensity = 50,
  tint = "dark",
  style,
}: GlassmorphicCardProps) {
  return (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFillObject}
      >
        <View style={styles.overlay} />
      </BlurView>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

interface ShimmerEffectProps {
  width?: number;
  height?: number;
  borderRadius?: number;
}

export function ShimmerEffect({
  width = 100,
  height = 20,
  borderRadius = 4,
}: ShimmerEffectProps) {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View
      style={[
        styles.shimmerContainer,
        {
          width,
          height,
          borderRadius,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.shimmerGradient,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

interface ParallaxScrollHeaderProps {
  scrollY: Animated.Value;
  headerHeight: number;
  imageUri: string;
  children?: React.ReactNode;
}

export function ParallaxScrollHeader({
  scrollY,
  headerHeight,
  imageUri,
  children,
}: ParallaxScrollHeaderProps) {
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight / 2],
    extrapolate: "clamp",
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, headerHeight / 2, headerHeight],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-headerHeight, 0, headerHeight],
    outputRange: [2, 1, 0.8],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[
        styles.parallaxHeader,
        {
          height: headerHeight,
          transform: [{ translateY: headerTranslate }],
        },
      ]}
    >
      <Animated.Image
        source={{ uri: imageUri }}
        style={[
          styles.parallaxImage,
          {
            opacity: imageOpacity,
            transform: [{ scale: imageScale }],
          },
        ]}
      />
      {children}
    </Animated.View>
  );
}

interface PulseAnimationProps {
  children: React.ReactNode;
  duration?: number;
  minScale?: number;
  maxScale?: number;
}

export function PulseAnimation({
  children,
  duration = 1000,
  minScale = 1,
  maxScale = 1.05,
}: PulseAnimationProps) {
  const pulseAnim = React.useRef(new Animated.Value(minScale)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: maxScale,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: minScale,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      {children}
    </Animated.View>
  );
}

interface RotatingIconProps {
  children: React.ReactNode;
  duration?: number;
}

export function RotatingIcon({ children, duration = 2000 }: RotatingIconProps) {
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: duration,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      {children}
    </Animated.View>
  );
}

interface FloatingButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
}

export function FloatingButton({
  children,
  onPress,
  style,
}: FloatingButtonProps) {
  const floatAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ translateY: floatAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <Animated.View onTouchStart={handlePressIn} onTouchEnd={handlePressOut}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  content: {
    padding: 16,
  },
  shimmerContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  shimmerGradient: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  parallaxHeader: {
    overflow: "hidden",
  },
  parallaxImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
});
