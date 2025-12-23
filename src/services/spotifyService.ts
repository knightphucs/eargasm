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
        preview_url: null,
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

export const getAlbumTracks = async (
  token: string,
  albumId: string,
  market = "VN"
) => {
  const response = await fetch(
    `https://api.spotify.com/v1/albums/${albumId}/tracks?market=${market}&limit=50`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return await response.json();
};

export const checkUserSavedAlbums = async (token: string, albumId: string) => {
  const response = await fetch(
    `https://api.spotify.com/v1/me/albums/contains?ids=${albumId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();
  return data[0];
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

export const getArtistTopTracks = async (
  token: string,
  artistId: string,
  market = "VN"
) => {
  const response = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return await response.json();
};

export const getArtistAlbums = async (token: string, artistId: string) => {
  const response = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=10`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return await response.json();
};

import AsyncStorage from "@react-native-async-storage/async-storage";
const TOKEN_KEY = "spotify_access_token";
const EXPIRATION_KEY = "spotify_token_expiration";

export const saveToken = async (
  token: string,
  expiresIn: number,
  userId: string
) => {
  try {
    const expirationTime = new Date().getTime() + expiresIn * 1000;
    // Key theo userId: spotify_token_abc123...
    await AsyncStorage.setItem(`spotify_token_${userId}`, token);
    await AsyncStorage.setItem(
      `spotify_expiration_${userId}`,
      expirationTime.toString()
    );
  } catch (e) {
    console.error("Error saving token", e);
  }
};

export const getSavedToken = async (userId: string) => {
  try {
    const tokenKey = `spotify_token_${userId}`;
    const expKey = `spotify_expiration_${userId}`;

    const token = await AsyncStorage.getItem(tokenKey);
    const expirationTime = await AsyncStorage.getItem(expKey);

    if (!token || !expirationTime) return null;

    if (new Date().getTime() > parseInt(expirationTime)) {
      await AsyncStorage.multiRemove([tokenKey, expKey]);
      return null;
    }
    return token;
  } catch (e) {
    return null;
  }
};

export const clearToken = async (userId: string) => {
  await AsyncStorage.multiRemove([
    `spotify_token_${userId}`,
    `spotify_expiration_${userId}`,
  ]);
};

export const createPlaylist = async (
  token: string,
  userId: string,
  playlistName: string
) => {
  try {
    if (__DEV__)
      console.log(`📝 Creating playlist: ${playlistName} for user: ${userId}`);

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
          description: "Playlist created from Eargasm App (Demo)",
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
    if (__DEV__) console.error("❌ Error creating Playlist:", error);
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

export const getPlayableUrl = async (
  spotifyTrack: any
): Promise<string | null> => {
  // 1. Nếu Spotify có preview, dùng luôn (ưu tiên hàng chính chủ)
  if (spotifyTrack.preview_url) {
    return spotifyTrack.preview_url;
  }

  // 2. Nếu không, qua iTunes tìm "ké"
  try {
    const artistName = spotifyTrack.artists?.[0]?.name || "";
    const trackName = spotifyTrack.name || "";
    const query = `${trackName} ${artistName}`;

    // Gọi API iTunes (mặc định limit=1 để lấy kết quả đúng nhất)
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        query
      )}&media=music&entity=song&limit=1`
    );
    const data = await response.json();

    if (data.resultCount > 0) {
      return data.results[0].previewUrl; // Link .m4a chất lượng cao
    }
  } catch (error) {
    console.warn("Lỗi tìm nhạc bên iTunes:", error);
  }

  // 3. Đường cùng: Trả về null hoặc link cứng dự phòng
  return "https://cdn.pixabay.com/audio/2022/10/18/audio_31c2730e64.mp3";
};
