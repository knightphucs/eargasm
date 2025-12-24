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
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMusic } from "../context/MusicContext";
import { useTheme } from "../context/ThemeContext";
import { useSpotifyAuth } from "../context/SpotifyAuthContext";
import { db, auth } from "../config/firebaseConfig";
import { searchSpotify } from "../services/spotifyService";
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
  imageUrl?: string;
}

interface MusicTastePrediction {
  dominantGenre: string;
  listeningStyle: string;
  musicVibe: string;
  recommendation: string;
  diversityScore: number;
}

export default function StatsScreen() {
  const { currentTrack } = useMusic();
  const { colors, isDark } = useTheme();
  const { token } = useSpotifyAuth();
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
  const [musicTaste, setMusicTaste] = useState<MusicTastePrediction | null>(
    null
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
            imageUrl: track.album?.images?.[0]?.url || undefined,
          });
        }

        const artistStat = artistMap.get(artistName)!;
        artistStat.playCount += 1;
        if (!artistStat.topTracks.includes(track.name)) {
          artistStat.topTracks.push(track.name);
        }
        // Update image if we find a better one
        if (!artistStat.imageUrl && track.album?.images?.[0]?.url) {
          artistStat.imageUrl = track.album.images[0].url;
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

      // Calculate music taste prediction
      const prediction = predictMusicTaste(sorted, artistMap, snapshot.size);
      setMusicTaste(prediction);

      // Fetch artist images from Spotify
      if (token) {
        await fetchArtistImages(artistMap, token);
      }
    } catch (error) {
      if (__DEV__) console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtistImages = async (
    artists: Map<string, ArtistStats>,
    spotifyToken: string
  ) => {
    const topArtists = Array.from(artists.values())
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 5);

    for (const artist of topArtists) {
      try {
        const searchResult = await searchSpotify(
          spotifyToken,
          artist.name,
          "artist"
        );
        const artistResult = searchResult.artists?.items?.[0];

        if (artistResult?.images?.[0]?.url) {
          const updatedArtist = artists.get(artist.name);
          if (updatedArtist) {
            updatedArtist.imageUrl = artistResult.images[0].url;
          }
        }
      } catch (error) {
        if (__DEV__)
          console.error(`Failed to fetch image for ${artist.name}:`, error);
      }
    }

    // Update state with fetched images
    setArtistStats(new Map(artists));
  };

  const predictMusicTaste = (
    tracks: TrackWithCount[],
    artists: Map<string, ArtistStats>,
    totalTracks: number
  ): MusicTastePrediction => {
    // Analyze artist diversity
    const uniqueArtists = artists.size;
    const diversityScore = Math.min(
      100,
      Math.round((uniqueArtists / Math.max(totalTracks / 3, 5)) * 100)
    );

    // Analyze listening patterns
    const topArtistCount = Array.from(artists.values())[0]?.playCount || 0;
    const totalArtistPlays = Array.from(artists.values()).reduce(
      (sum, a) => sum + a.playCount,
      0
    );
    const concentrationRatio = topArtistCount / Math.max(totalArtistPlays, 1);

    // Determine music vibe based on artist names (simple heuristic)
    const artistNames = Array.from(artists.keys())
      .slice(0, 5)
      .join(" ")
      .toLowerCase();
    const vibeKeywords = {
      chill: [
        "ed sheeran",
        "the weeknd",
        "billie",
        "ariana",
        "dua lipa",
        "post malone",
      ],
      energetic: ["travis scott", "drake", "eminem", "kanye", "lil", "juice"],
      indie: ["the 1975", "arctic monkeys", "glass animals", "tame impala"],
      classical: ["mozart", "beethoven", "chopin", "bach"],
      hip_hop: ["j cole", "kendrick", "nas", "jay z", "biggie"],
      pop: ["taylor", "coldplay", "bruno", "charlie puth"],
    };

    let dominantVibe = "Eclectic";
    let maxMatches = 0;

    for (const [vibe, keywords] of Object.entries(vibeKeywords)) {
      const matches = keywords.filter((keyword) =>
        artistNames.includes(keyword)
      ).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        dominantVibe = vibe
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    }

    // Determine listening style
    let listeningStyle = "Casual Listener";
    if (totalTracks > 100) {
      listeningStyle = "Dedicated Fan";
      if (totalTracks > 300) {
        listeningStyle = "Music Enthusiast";
      }
      if (totalTracks > 500) {
        listeningStyle = "Obsessed Music Lover";
      }
    }

    // Determine genre concentration
    let dominantGenre = "Diverse";
    if (concentrationRatio > 0.4) {
      dominantGenre = `Focused on ${Array.from(artists.keys())[0]}`;
    } else if (uniqueArtists < 10) {
      dominantGenre = "Artist-Focused";
    } else if (diversityScore > 70) {
      dominantGenre = "Genre Hopper";
    }

    // Generate recommendation
    const recommendations = [
      `Try discovering more artists similar to ${
        Array.from(artists.keys())[0]
      }`,
      `Explore playlists with artists like ${
        Array.from(artists.keys())[1] || "your favorites"
      }`,
      `Consider branching out to ${dominantVibe} alternatives`,
      `Check out ${dominantVibe} releases from this week`,
    ];

    const recommendation =
      recommendations[Math.floor(Math.random() * recommendations.length)];

    return {
      dominantGenre,
      listeningStyle,
      musicVibe: dominantVibe,
      recommendation,
      diversityScore,
    };
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

  const getDiversityColor = (score: number): string => {
    if (score > 70) return "#1DB954"; // Green
    if (score > 40) return "#FFD700"; // Gold
    return "#FF6B6B"; // Red
  };

  const getDiversityDescription = (score: number): string => {
    if (score > 70)
      return "You explore a wide range of artists! Very adventurous taste.";
    if (score > 40)
      return "You enjoy variety but have clear preferences. Balanced taste.";
    return "You have focused preferences. Loyal to your favorite artists.";
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Your Stats</Text>
        <View style={styles.timeRangeButtons}>
          {(["week", "month", "all-time"] as const).map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeRange(range);
              }}
              activeOpacity={0.7}
              style={[
                styles.timeButton,
                { backgroundColor: colors.surface },
                timeRange === range && styles.timeButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.timeButtonText,
                  { color: colors.text },
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

      {/* Music Taste Prediction */}
      {musicTaste && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Your Music Profile
          </Text>

          {/* Main Profile Card */}
          <LinearGradient
            colors={["#1DB954", "#1aa34a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={styles.profileHeader}>
              <View style={styles.profileIconBox}>
                <Ionicons name="sparkles" size={32} color="white" />
              </View>
              <View style={styles.profileTextBox}>
                <Text style={styles.profileCategory}>Listener Type</Text>
                <Text style={styles.profileTitle}>
                  {musicTaste.listeningStyle}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Info Cards Grid */}
          <View style={styles.infoGrid}>
            {/* Music Vibe Card */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.surface, borderLeftColor: "#1DB954" },
              ]}
            >
              <View style={styles.infoCardHeader}>
                <Ionicons name="musical-notes" size={20} color="#1DB954" />
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Music Vibe
                </Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {musicTaste.musicVibe}
              </Text>
            </View>

            {/* Genre Focus Card */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.surface, borderLeftColor: "#1DB954" },
              ]}
            >
              <View style={styles.infoCardHeader}>
                <Ionicons name="radio" size={20} color="#1DB954" />
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Genre Focus
                </Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {musicTaste.dominantGenre}
              </Text>
            </View>
          </View>

          {/* Diversity Section */}
          <View
            style={[
              styles.diversitySection,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.diversityHeader}>
              <Ionicons name="analytics" size={20} color="#1DB954" />
              <Text style={[styles.diversityLabel, { color: colors.text }]}>
                Music Diversity
              </Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.diversityBar}>
                <View
                  style={[
                    styles.diversityFill,
                    {
                      width: `${musicTaste.diversityScore}%`,
                      backgroundColor: getDiversityColor(
                        musicTaste.diversityScore
                      ),
                    },
                  ]}
                />
              </View>
              <Text
                style={[styles.percentageText, { color: colors.textSecondary }]}
              >
                {musicTaste.diversityScore}%
              </Text>
            </View>

            <Text style={[styles.diversityDescription, { color: colors.text }]}>
              {getDiversityDescription(musicTaste.diversityScore)}
            </Text>
          </View>

          {/* Recommendation Card */}
          <View
            style={[
              styles.recommendationSection,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.recommendationHeader}>
              <View style={styles.bulbIcon}>
                <Ionicons name="bulb" size={18} color="#FFD700" />
              </View>
              <Text
                style={[styles.recommendationTitle, { color: colors.text }]}
              >
                Recommendation
              </Text>
            </View>
            <Text
              style={[
                styles.recommendationText,
                { color: colors.textSecondary },
              ]}
            >
              {musicTaste.recommendation}
            </Text>
          </View>
        </View>
      )}

      {/* Top Tracks */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Top Tracks
        </Text>
        {topTracks.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No listening history yet
          </Text>
        ) : (
          <FlatList
            data={topTracks}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View
                style={[styles.trackItem, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.rank, { color: colors.textSecondary }]}>
                  #{index + 1}
                </Text>
                <Image
                  source={{ uri: item.album.images[0]?.url || "" }}
                  style={styles.trackImage}
                />
                <View style={styles.trackInfo}>
                  <Text
                    style={[styles.trackName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.trackArtist,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {item.artists[0]?.name}
                  </Text>
                  <Text
                    style={[styles.trackMeta, { color: colors.textSecondary }]}
                  >
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Top Artists
        </Text>
        {getTopArtists().length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No artist data yet
          </Text>
        ) : (
          getTopArtists().map((artist) => (
            <View
              key={artist.name}
              style={[styles.artistItem, { backgroundColor: colors.surface }]}
            >
              {artist.imageUrl ? (
                <Image
                  source={{ uri: artist.imageUrl }}
                  style={styles.artistImage}
                />
              ) : (
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
              )}
              <View style={styles.artistInfo}>
                <Text style={[styles.artistName, { color: colors.text }]}>
                  {artist.name}
                </Text>
                <Text
                  style={[styles.artistMeta, { color: colors.textSecondary }]}
                >
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
    paddingHorizontal: 20,
    paddingTop: 40,
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
  artistImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  profileCard: {
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  profileIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileTextBox: {
    flex: 1,
  },
  profileCategory: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  diversitySection: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  diversityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  diversityLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressContainer: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  diversityBar: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  diversityFill: {
    height: "100%",
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: "700",
    minWidth: 40,
  },
  diversityDescription: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  recommendationSection: {
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  bulbIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,215,0,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  recommendationTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  recommendationText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
});
