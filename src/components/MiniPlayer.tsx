import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMusic } from "../context/MusicContext";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function MiniPlayer() {
  const { currentTrack, isPlaying, playTrack, closePlayer } = useMusic();

  const translateY = useRef(new Animated.Value(100)).current;

  const isPlayerVisible = useRef(false);

  useEffect(() => {
    if (currentTrack) {
      if (!isPlayerVisible.current) {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 12,
          bounciness: 5,
        }).start();
        isPlayerVisible.current = true;
      }
    } else {
      Animated.timing(translateY, {
        toValue: 150,
        duration: 300,
        useNativeDriver: true,
      }).start();
      isPlayerVisible.current = false;
    }
  }, [currentTrack]);

  if (!currentTrack) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      {/* Thanh tiến trình giả */}
      <View style={styles.progressBar} />

      <View style={styles.content}>
        <Image
          source={{
            uri:
              currentTrack.album?.images[0]?.url ||
              "https://via.placeholder.com/50",
          }}
          style={styles.img}
        />

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.name}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentTrack.artists[0]?.name}
          </Text>
        </View>

        <View style={styles.controls}>
          {/* Nút Previous */}
          <TouchableOpacity style={styles.controlBtn}>
            <Ionicons name="play-skip-back" size={24} color="white" />
          </TouchableOpacity>

          {/* Nút Play/Pause */}
          <TouchableOpacity
            onPress={() => playTrack(currentTrack)}
            style={styles.playBtn}
          >
            <Ionicons
              name={isPlaying ? "pause-circle" : "play-circle"}
              size={40}
              color="white"
            />
          </TouchableOpacity>

          {/* Nút Next */}
          <TouchableOpacity style={styles.controlBtn}>
            <Ionicons name="play-skip-forward" size={24} color="white" />
          </TouchableOpacity>

          {/* Nút Close */}
          <TouchableOpacity onPress={closePlayer} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#bbb" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 78,
    left: 10,
    right: 10,
    backgroundColor: "#202020",
    borderRadius: 8,
    zIndex: 9999,
    elevation: 10, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: "#333",
  },
  progressBar: {
    height: 2,
    backgroundColor: "#1DB954",
    width: "100%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  img: {
    width: 42,
    height: 42,
    borderRadius: 4,
    backgroundColor: "#333",
  },
  info: {
    flex: 1,
    marginLeft: 10,
    justifyContent: "center",
    marginRight: 5,
  },
  title: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
  },
  artist: {
    color: "#b3b3b3",
    fontSize: 11,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
  },
  controlBtn: {
    padding: 5,
  },
  playBtn: {
    marginHorizontal: 5,
  },
  closeBtn: {
    marginLeft: 10,
    padding: 5,
    borderLeftWidth: 1,
    borderLeftColor: "#333",
  },
});
