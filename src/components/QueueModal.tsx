import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

interface QueueTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  preview_url?: string;
}

interface QueueModalProps {
  visible: boolean;
  queue: QueueTrack[];
  currentTrackId?: string;
  onClose: () => void;
  onTrackSelect: (track: QueueTrack) => void;
  onRemoveTrack: (trackId: string) => void;
}

export const QueueModal = ({
  visible,
  queue,
  currentTrackId,
  onClose,
  onTrackSelect,
  onRemoveTrack,
}: QueueModalProps) => {
  const slideAnim = useRef(new Animated.Value(height)).current;

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
  }, [visible, slideAnim]);

  const renderQueueItem = ({
    item,
    index,
  }: {
    item: QueueTrack;
    index: number;
  }) => {
    const isCurrentTrack = item.id === currentTrackId;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.queueItem, isCurrentTrack && styles.queueItemActive]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onTrackSelect(item);
        }}
      >
        {/* Album Art */}
        <Image
          source={{ uri: item.album.images[0]?.url || "" }}
          style={styles.queueItemImage}
        />

        {/* Track Info */}
        <View style={styles.queueItemInfo}>
          <Text
            style={[
              styles.queueItemName,
              isCurrentTrack && styles.queueItemNameActive,
            ]}
            numberOfLines={1}
          >
            {isCurrentTrack && "▶ "}
            {item.name}
          </Text>
          <Text style={styles.queueItemArtist} numberOfLines={1}>
            {item.artists[0]?.name || "Unknown"}
          </Text>
        </View>

        {/* Index Badge */}
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>

        {/* Remove Button */}
        <TouchableOpacity
          onPress={() => onRemoveTrack(item.id)}
          style={styles.removeButton}
        >
          <Ionicons name="close" size={18} color="#ff5252" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const emptyListComponent = (
    <View style={styles.emptyContainer}>
      <Ionicons name="radio-outline" size={48} color="#666" />
      <Text style={styles.emptyText}>Queue is empty</Text>
      <Text style={styles.emptySubtext}>Add tracks to see them here</Text>
    </View>
  );

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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="chevron-down" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Queue ({queue.length})</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Queue List */}
          {queue.length === 0 ? (
            <View style={styles.emptyWrapper}>{emptyListComponent}</View>
          ) : (
            <FlatList
              data={queue}
              keyExtractor={(item: QueueTrack, index: number) =>
                `${item.id}-${index}`
              }
              renderItem={renderQueueItem}
              contentContainerStyle={styles.listContent}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: height * 0.8,
    backgroundColor: "#121212",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#282828",
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#888",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginVertical: 4,
    marginHorizontal: 8,
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  queueItemActive: {
    backgroundColor: "#1DB954",
    borderLeftColor: "#1DB954",
  },
  queueItemImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  queueItemNameActive: {
    color: "white",
    fontWeight: "700",
  },
  queueItemArtist: {
    fontSize: 12,
    color: "#b3b3b3",
    marginTop: 2,
  },
  indexBadge: {
    backgroundColor: "#282828",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  indexText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1DB954",
  },
  removeButton: {
    padding: 8,
  },
});
