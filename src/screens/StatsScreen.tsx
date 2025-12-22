import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMusic } from "../context/MusicContext";
import { db, auth } from "../config/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";

const { width } = Dimensions.get("window");

interface TrackWithCount {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  playCount: number;
  totalDuration: number;
}

interface ArtistStats {
  name: string;
  playCount: number;
  topTracks: string[];
}

export default function StatsScreen() {
  const { currentTrack } = useMusic();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [topTracks, setTopTracks] = useState<TrackWithCount[]>([]);
  const [artistStats, setArtistStats] = useState<Map<string, ArtistStats>>(
    new Map()
  );
  const [totalListeningTime, setTotalListeningTime] = useState(0);
  const [totalTracksPlayed, setTotalTracksPlayed] = useState(0);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all-time">(
    "week"
  );

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, timeRange]);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const historyRef = collection(db, "users", user.uid, "listening_history");

      // Calculate date range
      const now = new Date();
      let startDate = new Date();

      if (timeRange === "week") {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === "month") {
        startDate.setMonth(now.getMonth() - 1);
      }
      // else "all-time" has no date restriction

      const q =
        timeRange === "all-time"
          ? query(historyRef, orderBy("playedAt", "desc"))
          : query(
              historyRef,
              where("playedAt", ">=", startDate),
              orderBy("playedAt", "desc")
            );

      const snapshot = await getDocs(q);

      const trackMap = new Map<string, TrackWithCount>();
      const artistMap = new Map<string, ArtistStats>();
      let totalTime = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const track = data.track;

        if (!track) return;

        // Track stats
        if (!trackMap.has(track.id)) {
          trackMap.set(track.id, {
            id: track.id,
            name: track.name,
            artists: track.artists || [],
            album: track.album || { images: [] },
            playCount: 0,
            totalDuration: 0,
          });
        }

        const trackStats = trackMap.get(track.id)!;
        trackStats.playCount += 1;
        trackStats.totalDuration += data.duration || 0;
        totalTime += data.duration || 0;

        // Artist stats
        const artistName = track.artists?.[0]?.name || "Unknown Artist";
        if (!artistMap.has(artistName)) {
          artistMap.set(artistName, {
            name: artistName,
            playCount: 0,
            topTracks: [],
          });
        }

        const artistStat = artistMap.get(artistName)!;
        artistStat.playCount += 1;
        if (!artistStat.topTracks.includes(track.name)) {
          artistStat.topTracks.push(track.name);
        }
      });

      // Sort tracks by play count
      const sorted = Array.from(trackMap.values())
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 10);

      setTopTracks(sorted);
      setArtistStats(artistMap);
      setTotalListeningTime(totalTime);
      setTotalTracksPlayed(snapshot.size);
    } catch (error) {
      if (__DEV__) console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getTopArtists = () => {
    return Array.from(artistStats.values())
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Stats</Text>
        <View style={styles.timeRangeButtons}>
          {(["week", "month", "all-time"] as const).map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={[
                styles.timeButton,
                timeRange === range && styles.timeButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.timeButtonText,
                  timeRange === range && styles.timeButtonTextActive,
                ]}
              >
                {range === "all-time"
                  ? "All Time"
                  : range.charAt(0).toUpperCase() + range.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Overview Cards */}
      <View style={styles.overview}>
        <LinearGradient
          colors={["#1DB954", "#1aa34a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Ionicons name="time" size={32} color="white" />
          <Text style={styles.cardValue}>{formatTime(totalListeningTime)}</Text>
          <Text style={styles.cardLabel}>Total Listening</Text>
        </LinearGradient>

        <LinearGradient
          colors={["#1DB954", "#1aa34a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Ionicons name="musical-notes" size={32} color="white" />
          <Text style={styles.cardValue}>{totalTracksPlayed}</Text>
          <Text style={styles.cardLabel}>Tracks Played</Text>
        </LinearGradient>
      </View>

      {/* Top Tracks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Tracks</Text>
        {topTracks.length === 0 ? (
          <Text style={styles.emptyText}>No listening history yet</Text>
        ) : (
          <FlatList
            data={topTracks}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={styles.trackItem}>
                <Text style={styles.rank}>#{index + 1}</Text>
                <Image
                  source={{ uri: item.album.images[0]?.url || "" }}
                  style={styles.trackImage}
                />
                <View style={styles.trackInfo}>
                  <Text style={styles.trackName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {item.artists[0]?.name}
                  </Text>
                  <Text style={styles.trackMeta}>
                    {item.playCount} plays • {formatTime(item.totalDuration)}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Top Artists */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Artists</Text>
        {getTopArtists().length === 0 ? (
          <Text style={styles.emptyText}>No artist data yet</Text>
        ) : (
          getTopArtists().map((artist) => (
            <View key={artist.name} style={styles.artistItem}>
              <View
                style={[
                  styles.artistAvatar,
                  {
                    backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
                  },
                ]}
              >
                <Text style={styles.artistInitial}>
                  {artist.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.artistInfo}>
                <Text style={styles.artistName}>{artist.name}</Text>
                <Text style={styles.artistMeta}>
                  {artist.playCount} plays • {artist.topTracks.length} tracks
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
  },
  timeRangeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#282828",
    borderWidth: 1,
    borderColor: "transparent",
  },
  timeButtonActive: {
    backgroundColor: "#1DB954",
    borderColor: "#1DB954",
  },
  timeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#b3b3b3",
  },
  timeButtonTextActive: {
    color: "white",
  },
  overview: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginTop: 8,
  },
  cardLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    paddingVertical: 20,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#282828",
  },
  rank: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1DB954",
    width: 30,
  },
  trackImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  trackArtist: {
    fontSize: 12,
    color: "#b3b3b3",
    marginTop: 2,
  },
  trackMeta: {
    fontSize: 11,
    color: "#888",
    marginTop: 4,
  },
  artistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#282828",
  },
  artistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  artistInitial: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  artistMeta: {
    fontSize: 12,
    color: "#b3b3b3",
    marginTop: 4,
  },
});
