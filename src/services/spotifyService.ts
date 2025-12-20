import { SPOTIFY_CONFIG } from "../config/spotifyConfig";

// Hàm đổi Code lấy Token
export const exchangeCodeForToken = async (
  code: string,
  codeVerifier: string
) => {
  const requestBody = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: SPOTIFY_CONFIG.redirectUri,
    client_id: SPOTIFY_CONFIG.clientId,
    code_verifier: codeVerifier,
  }).toString();

  const response = await fetch(SPOTIFY_CONFIG.discovery.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: requestBody,
  });

  const json = await response.json();
  if (json.error) throw new Error(json.error_description || json.error);
  return json;
};

export const getUserProfile = async (token: string) => {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await response.json();
};

export const getUserTopTracks = async (token: string) => {
  const response = await fetch(
    "https://api.spotify.com/v1/browse/new-releases?limit=10",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const json = await response.json();

  if (json.albums && json.albums.items) {
    return {
      items: json.albums.items.map((album: any) => ({
        id: album.id,
        name: album.name,
        artists: album.artists,
        album: { images: album.images },
        preview_url: null, // New Releases thường không có preview, sẽ fallback sang nhạc demo
      })),
    };
  }
  return { items: [] };
};

export const searchSpotify = async (
  token: string,
  query: string,
  type = "track,artist"
) => {
  const encodedQuery = encodeURIComponent(query);
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodedQuery}&type=${type}&limit=10`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return await response.json();
};

export const getUserPlaylists = async (token: string) => {
  const response = await fetch(
    "https://api.spotify.com/v1/me/playlists?limit=20",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const json = await response.json();
  return json;
};

export const getAlbumDetails = async (token: string, albumId: string) => {
  const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await response.json();
};

export const getArtistDetails = async (token: string, artistId: string) => {
  const response = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return await response.json();
};

import AsyncStorage from "@react-native-async-storage/async-storage";
const TOKEN_KEY = "spotify_access_token";
const EXPIRATION_KEY = "spotify_token_expiration";

export const saveToken = async (token: string, expiresIn: number) => {
  try {
    const expirationTime = new Date().getTime() + expiresIn * 1000;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(EXPIRATION_KEY, expirationTime.toString());
  } catch (e) {
    console.error("Lỗi lưu token", e);
  }
};

export const getSavedToken = async () => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const expirationTime = await AsyncStorage.getItem(EXPIRATION_KEY);
    if (!token || !expirationTime) return null;
    const currentTime = new Date().getTime();
    if (currentTime > parseInt(expirationTime)) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  } catch (e) {
    return null;
  }
};

export const createPlaylist = async (
  token: string,
  userId: string,
  playlistName: string
) => {
  try {
    console.log(`📝 Đang tạo playlist: ${playlistName} cho user: ${userId}`);

    const response = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: playlistName,
          description: "Playlist tạo từ Eargasm App (Demo)",
          public: false, // Tạo playlist riêng tư cho an toàn
        }),
      }
    );

    const json = await response.json();

    if (json.error) {
      throw new Error(json.error.message);
    }

    return json;
  } catch (error) {
    console.error("❌ Lỗi tạo Playlist:", error);
    throw error;
  }
};

export const addTrackToPlaylist = async (
  token: string,
  playlistId: string,
  trackUri: string
) => {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [trackUri],
      }),
    }
  );
  return await response.json();
};

export const addItemToQueue = async (token: string, trackUri: string) => {
  await fetch(
    `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(
      trackUri
    )}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

export const getPlaylistTracks = async (token: string, playlistId: string) => {
  const timestamp = new Date().getTime();
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?t=${timestamp}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return await response.json();
};

export const removeTrackFromPlaylist = async (
  token: string,
  playlistId: string,
  trackUri: string
) => {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tracks: [{ uri: trackUri }],
      }),
    }
  );
  return await response.json();
};
