import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";

//Types
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
//Context
const UserContext = createContext<UserContextType | undefined>(undefined);

//Provider
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);


  //Listen Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Load Firestore user profile
      const userRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(userRef);

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

        await setDoc(userRef, newUser);
        setUserProfile(newUser);
      } else {
        setUserProfile(snapshot.data() as UserProfile);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

//Update profile
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!firebaseUser) return;

    const userRef = doc(db, "users", firebaseUser.uid);
    await updateDoc(userRef, data);

    setUserProfile((prev) =>
      prev ? { ...prev, ...data } : prev
    );
  };
//Logout
  const logout = async () => {
    await auth.signOut();
    setFirebaseUser(null);
    setUserProfile(null);
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
//Hook
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }
  return context;
};
