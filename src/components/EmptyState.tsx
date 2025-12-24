import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = "musical-notes-outline",
  title,
  message,
  actionText,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Animated Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(29, 185, 84, 0.1)", "rgba(29, 185, 84, 0.05)"]}
          style={styles.iconBackground}
        >
          <Ionicons name={icon} size={64} color="#1DB954" />
        </LinearGradient>
      </Animated.View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {/* Message */}
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>

      {/* Action Button */}
      {actionText && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#1DB954", "#1ed760"]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.actionText}>{actionText}</Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color="white"
              style={styles.arrowIcon}
            />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Decorative Elements */}
      <View style={styles.decorativeContainer}>
        <Animated.View
          style={[
            styles.decorativeCircle,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.1],
                outputRange: [0.1, 0.2],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle2,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.1],
                outputRange: [0.05, 0.15],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(29, 185, 84, 0.2)",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 25,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#1DB954",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  actionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  arrowIcon: {
    marginLeft: 8,
  },
  decorativeContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  decorativeCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#1DB954",
    top: -100,
    right: -100,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#1DB954",
    bottom: -50,
    left: -50,
  },
});
