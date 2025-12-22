// src/components/BottomSheet.tsx
import React, { useEffect, useRef, ReactNode } from "react";
import {
  View,
  Modal,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  PanResponder,
  ViewStyle,
} from "react-native";

const { height } = Dimensions.get("window");

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: number[]; // % của màn hình
  backgroundColor?: string;
  containerStyle?: ViewStyle;
}

export const BottomSheet = ({
  visible,
  onClose,
  children,
  snapPoints = [90],
  backgroundColor = "#121212",
  containerStyle,
}: BottomSheetProps) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const snapHeight = (height * snapPoints[0]) / 100;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Chỉ kích hoạt khi kéo xuống
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Đóng nếu kéo xuống quá 100px hoặc velocity cao
          Animated.timing(slideAnim, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            panY.setValue(0);
          });
        } else {
          // Quay về vị trí ban đầu
          Animated.spring(panY, {
            toValue: 0,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const translateY = Animated.add(slideAnim, panY);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Bottom Sheet Content */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor,
              maxHeight: snapHeight,
              transform: [{ translateY }],
            },
            containerStyle,
          ]}
        >
          {/* Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Content */}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  content: {
    flex: 1,
  },
});
