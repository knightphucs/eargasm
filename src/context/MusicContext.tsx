import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useRef,
  useCallback,
} from "react";
import { Audio } from "expo-av";
import { db, auth } from "../config/firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";

interface MusicContextType {
  isPlaying: boolean;
  currentTrack: any;
  isExpanded: boolean;
  playTrack: (track: any, list?: any[]) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  closePlayer: () => void;
  expandPlayer: () => void;
  collapsePlayer: () => void;
  position: number;
  duration: number;
  seekTo: (value: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const playStartTimeRef = useRef<number | null>(null);

  const seekTo = async (value: number) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(value);
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const expandPlayer = () => setIsExpanded(true);
  const collapsePlayer = () => setIsExpanded(false);

  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);

  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [queue, setQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Save listening history to Firestore
  const saveListeningHistory = useCallback(async (track: any) => {
    try {
      const user = auth.currentUser;
      if (!user || !playStartTimeRef.current) return;

      const playDuration = Date.now() - playStartTimeRef.current;

      // Only save if played for at least 3 seconds
      if (playDuration < 3000) return;

      const historyRef = collection(db, "users", user.uid, "listening_history");

      await addDoc(historyRef, {
        track: {
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: track.album,
        },
        duration: playDuration,
        playedAt: Timestamp.now(),
      });
    } catch (error) {
      if (__DEV__) console.error("Failed to save listening history:", error);
    }
  }, []);

  const playNext = async () => {
    if (queue.length === 0) return;
    const nextIndex = (currentIndex + 1) % queue.length;
    setCurrentIndex(nextIndex);
    await playTrack(queue[nextIndex]);
  };

  const playPrevious = async () => {
    if (queue.length === 0) return;
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    setCurrentIndex(prevIndex);
    await playTrack(queue[prevIndex]);
  };

  const playTrack = async (track: any, list?: any[]) => {
    const previewUrl =
      track.preview_url ||
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    try {
      // Save previous track history before switching
      if (currentTrack && currentTrack.id !== track.id) {
        await saveListeningHistory(currentTrack);
      }

      // Nếu truyền danh sách bài → set queue
      if (list) {
        setQueue(list);
        const index = list.findIndex((t) => t.id === track.id);
        setCurrentIndex(index);
      }

      if (currentTrack?.id === track.id && soundRef.current) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      setCurrentTrack(track);
      setIsPlaying(true);
      playStartTimeRef.current = Date.now();

      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (!status.isLoaded) return;
        setPosition(status.positionMillis);
        setDuration(status.durationMillis || 1);

        if (status.didJustFinish) {
          playNext();
        }
      });
    } catch (e) {
      if (__DEV__) console.error(e);
    }
  };

  const pauseTrack = async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    }
  };

  const resumeTrack = async () => {
    if (soundRef.current) {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const closePlayer = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    // Save history before closing
    if (currentTrack) {
      await saveListeningHistory(currentTrack);
    }

    setCurrentTrack(null);
    setIsPlaying(false);
  };

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        currentTrack,
        isExpanded,
        playTrack,
        pauseTrack,
        resumeTrack,
        closePlayer,
        expandPlayer,
        collapsePlayer,
        position,
        duration,
        seekTo,
        playNext,
        playPrevious,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error("useMusic must be used within a MusicProvider");
  return context;
};
