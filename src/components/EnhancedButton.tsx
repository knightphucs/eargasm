import React, { useRef } from "react";
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from "react-native";
import * as Haptics from "expo-haptics";

interface EnhancedButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  hapticStyle?: "light" | "medium" | "heavy";
  scaleValue?: number;
  disabled?: boolean;
}

export default function EnhancedButton({
  onPress,
  children,
  style,
  hapticStyle = "light",
  scaleValue = 0.95,
  disabled = false,
}: EnhancedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled) return;

    // Haptic feedback
    if (hapticStyle === "light") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (hapticStyle === "medium") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    // Scale animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: scaleValue,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
