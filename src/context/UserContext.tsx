// src/context/UserContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
// 👇 Thêm onSnapshot vào import
import { doc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";

// Types
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string;
  spotify?: {
    isConnected: boolean;
    accessToken: string | null;
  };
}

interface UserContextType {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

// Context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen Auth State & Firestore Changes
  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Nếu có listener cũ thì hủy trước khi tạo cái mới
      if (unsubscribeSnapshot) unsubscribeSnapshot();

      setFirebaseUser(user);

      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);

      // 👇 DÙNG ONSNAPSHOT ĐỂ LẮNG NGHE THAY ĐỔI TỪ FIREBASE
      unsubscribeSnapshot = onSnapshot(userRef, async (snapshot) => {
        if (!snapshot.exists()) {
          // Safety net: create profile if missing
          const newUser: UserProfile = {
            uid: user.uid,
            email: user.email ?? "",
            displayName: user.email?.split("@")[0] ?? "New User",
            avatarUrl: null,
            spotify: {
              isConnected: false,
              accessToken: null,
            },
          };
          // Khi setDoc xong, onSnapshot sẽ tự chạy lại để cập nhật state
          await setDoc(userRef, newUser);
        } else {
          // Tự động cập nhật UserProfile khi SpotifyAuthContext ghi token
          setUserProfile(snapshot.data() as UserProfile);
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Update profile
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!firebaseUser) return;

    const userRef = doc(db, "users", firebaseUser.uid);
    await updateDoc(userRef, data);
    // Không cần setUserProfile thủ công ở đây nữa vì onSnapshot sẽ lo việc đó
  };

  // Logout
  const logout = async () => {
    await auth.signOut();
    // State sẽ tự reset nhờ onAuthStateChanged ở trên
  };

  return (
    <UserContext.Provider
      value={{
        firebaseUser,
        userProfile,
        loading,
        updateUserProfile,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Hook
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }
  return context;
};