import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useRef,
} from "react";
import { Audio } from "expo-av";

interface MusicContextType {
  isPlaying: boolean;
  currentTrack: any;
  playTrack: (track: any) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  closePlayer: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const soundRef = useRef<Audio.Sound | null>(null);

  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playTrack = async (track: any) => {
    const previewUrl =
      track.preview_url ||
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    try {
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

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true }
      );

      // Lưu vào Ref
      soundRef.current = newSound;

      // Tự động reset icon khi hết nhạc
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error("Lỗi phát nhạc:", error);
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
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        currentTrack,
        playTrack,
        pauseTrack,
        resumeTrack,
        closePlayer,
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
