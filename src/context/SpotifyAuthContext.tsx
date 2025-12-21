import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { useAuthRequest, ResponseType } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { SPOTIFY_CONFIG } from "../config/spotifyConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";

import {
  exchangeCodeForToken,
  getUserProfile,
  saveToken,
  getSavedToken,
} from "../services/spotifyService";
import AsyncStorage from "@react-native-async-storage/async-storage";

WebBrowser.maybeCompleteAuthSession();

type SpotifyContextType = {
  token: string | null;
  loading: boolean;
  userProfile: any;
  connectSpotify: () => void;
  logoutSpotify: () => Promise<void>;
};

const SpotifyAuthContext = createContext<SpotifyContextType | null>(null);

export const SpotifyAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [request, response, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.Code,
      clientId: SPOTIFY_CONFIG.clientId,
      scopes: SPOTIFY_CONFIG.scopes,
      usePKCE: true,
      redirectUri: SPOTIFY_CONFIG.redirectUri,
    },
    SPOTIFY_CONFIG.discovery
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setToken(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const savedToken = await getSavedToken();

      if (savedToken) {
        setToken(savedToken);
        const profile = await getUserProfile(savedToken);
        setUserProfile(profile);
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      handleExchangeToken(response.params.code);
    }
  }, [response]);

  const connectSpotify = () => {
    if (!request) return;
    promptAsync();
  };

  const handleExchangeToken = async (code: string) => {
    try {
      setLoading(true);
      const tokenResult = await exchangeCodeForToken(
        code,
        request?.codeVerifier || ""
      );

      const { access_token, expires_in } = tokenResult;

      setToken(access_token);
      await saveToken(access_token, expires_in);

      const profile = await getUserProfile(access_token);
      setUserProfile(profile);

      // Save status to Firestore
      if (auth.currentUser) {
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            spotify: { isConnected: true },
          },
          { merge: true }
        );
      }
    } catch (err: any) {
      Alert.alert("Spotify Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const logoutSpotify = async () => {
    // clear spotify state
    setToken(null);
    setUserProfile(null);

    // clear storage
    await AsyncStorage.multiRemove([
      "spotify_access_token",
      "spotify_token_expiration",
    ]);

    // logout firebase
    await signOut(auth);
  };

  return (
    <SpotifyAuthContext.Provider
      value={{
        token,
        loading,
        userProfile,
        connectSpotify,
        logoutSpotify,
      }}
    >
      {children}
    </SpotifyAuthContext.Provider>
  );
};

export const useSpotifyAuth = () => {
  const ctx = useContext(SpotifyAuthContext);
  if (!ctx) throw new Error("useSpotifyAuth must be used inside Provider");
  return ctx;
};
