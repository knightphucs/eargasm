// src/components/SleepTimer.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

interface SleepTimerProps {
  visible: boolean;
  onClose: () => void;
  onTimerEnd: () => void;
}

const PRESETS = [
  { label: "15 phút", minutes: 15 },
  { label: "30 phút", minutes: 30 },
  { label: "45 phút", minutes: 45 },
  { label: "60 phút", minutes: 60 },
];

export const SleepTimer = ({
  visible,
  onClose,
  onTimerEnd,
}: SleepTimerProps) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const slideAnim = useRef(new Animated.Value(height)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 10,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            onTimerEnd();
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, remainingSeconds]);

  useEffect(() => {
    if (selectedMinutes && remainingSeconds > 0) {
      const progress = 1 - remainingSeconds / (selectedMinutes * 60);
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [remainingSeconds, selectedMinutes]);

  const handleStart = (minutes: number) => {
    setSelectedMinutes(minutes);
    setRemainingSeconds(minutes * 60);
    setIsActive(true);
    progressAnim.setValue(0);
  };

  const handleStop = () => {
    setIsActive(false);
    setRemainingSeconds(0);
    setSelectedMinutes(null);
    progressAnim.setValue(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const rotation = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContent,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Sleep Timer</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Timer Display */}
          {isActive ? (
            <View style={styles.timerDisplay}>
              <View style={styles.circularProgress}>
                <Animated.View
                  style={[
                    styles.progressRing,
                    { transform: [{ rotate: rotation }] },
                  ]}
                >
                  <LinearGradient
                    colors={["#1DB954", "#1aa34a"]}
                    style={styles.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </Animated.View>
                <View style={styles.innerCircle}>
                  <Ionicons name="moon" size={40} color="#1DB954" />
                  <Text style={styles.timeText}>
                    {formatTime(remainingSeconds)}
                  </Text>
                  <Text style={styles.timeLabel}>còn lại</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleStop();
                }}
                style={styles.stopButton}
                activeOpacity={0.7}
              >
                <Ionicons name="stop-circle" size={24} color="white" />
                <Text style={styles.stopButtonText}>Dừng Timer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.presetsContainer}>
              <Text style={styles.subtitle}>Chọn thời gian ngủ</Text>
              <View style={styles.presetsGrid}>
                {PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.minutes}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      handleStart(preset.minutes);
                    }}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={["#282828", "#1E1E1E"]}
                      style={styles.presetButton}
                    >
                      <Ionicons name="time-outline" size={32} color="#1DB954" />
                      <Text style={styles.presetLabel}>{preset.label}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#1DB954" />
                <Text style={styles.infoText}>
                  Nhạc sẽ tự động dừng khi hết thời gian
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#121212",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: height * 0.8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#282828",
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  timerDisplay: {
    alignItems: "center",
    padding: 40,
  },
  circularProgress: {
    width: 240,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  progressRing: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 8,
    borderColor: "#282828",
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
  },
  innerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#1E1E1E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#282828",
  },
  timeText: {
    fontSize: 48,
    fontWeight: "700",
    color: "white",
    marginTop: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: "#B3B3B3",
    marginTop: 4,
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FF5252",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  presetsContainer: {
    padding: 24,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 20,
    textAlign: "center",
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  presetButton: {
    width: (width - 72) / 2,
    aspectRatio: 1.2,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#282828",
  },
  presetLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginTop: 12,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1E1E1E",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#B3B3B3",
    lineHeight: 20,
  },
});
