// src/context/SpotifyAuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { useAuthRequest, ResponseType } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
// 👇 Quan trọng: Import getDoc, setDoc
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { SPOTIFY_CONFIG } from "../config/spotifyConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";

import {
  exchangeCodeForToken,
  getUserProfile,
  saveToken,
  getSavedToken,
  clearToken
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

  // --- 1. LOGIC KHÔI PHỤC TOKEN KHI MỞ APP ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setToken(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // A. Thử lấy từ bộ nhớ máy trước (nhanh)
      let activeToken = await getSavedToken(user.uid);

      // B. Nếu máy không có, lên Firestore lấy về (đồng bộ)
      if (!activeToken) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const spotifyData = data.spotify;

            // Kiểm tra token trên mây còn hạn không
            if (spotifyData?.accessToken && spotifyData?.tokenExpiration > Date.now()) {
               activeToken = spotifyData.accessToken;
               console.log("☁️ Restored Spotify token from Firestore");
               // Lưu lại vào máy để lần sau load nhanh hơn
               await saveToken(activeToken as string, 3600, user.uid); 
            }
          }
        } catch (e) {
          console.log("⚠️ Error fetching from Firestore", e);
        }
      }

      // C. Nếu tìm được token -> Set state & Load Profile
      if (activeToken) {
        setToken(activeToken);
        try {
            const profile = await getUserProfile(activeToken);
            setUserProfile(profile);
        } catch (e) {
            console.log("❌ Token invalid/expired");
            setToken(null);
        }
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

  // --- 2. LOGIC LƯU TOKEN LÊN FIRESTORE ---
  const handleExchangeToken = async (code: string) => {
    try {
      setLoading(true);
      const tokenResult = await exchangeCodeForToken(
        code,
        request?.codeVerifier || ""
      );

      const { access_token, expires_in } = tokenResult;

      // Lưu Local
      setToken(access_token);
      if (auth.currentUser) {
        await saveToken(access_token, expires_in, auth.currentUser.uid);
      }

      // Lấy Profile
      const profile = await getUserProfile(access_token);
      setUserProfile(profile);

      // 👇 QUAN TRỌNG: Lưu token lên Firestore tại đây
      if (auth.currentUser) {
        const expirationTime = Date.now() + (expires_in * 1000);
        
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            spotify: { 
                isConnected: true,
                accessToken: access_token, // ✅ PHẢI CÓ DÒNG NÀY
                tokenExpiration: expirationTime, // ✅ Lưu cả hạn dùng
                email: profile.email || null,
                id: profile.id
            },
          },
          { merge: true } // Merge để không mất dữ liệu khác (avatar, bio...)
        );
        console.log("✅ Saved Spotify Token to Firestore successfully");
      }
    } catch (err: any) {
      Alert.alert("Spotify Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const logoutSpotify = async () => {
    setToken(null);
    setUserProfile(null);

    // Update Firestore về null
    if (auth.currentUser) {
        await clearToken(auth.currentUser.uid);
        await setDoc(doc(db, "users", auth.currentUser.uid), {
            spotify: { isConnected: false, accessToken: null, tokenExpiration: 0 }
        }, { merge: true });
    }

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