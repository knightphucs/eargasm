// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyABXcuX4eZOcATxE46JZbsXrbiGUJUukZ0",
  authDomain: "eargasm-ab69e.firebaseapp.com",
  projectId: "eargasm-ab69e",
  storageBucket: "eargasm-ab69e.firebasestorage.app",
  messagingSenderId: "195274704414",
  appId: "1:195274704414:web:d8139c7f1e85a70474100f",
  measurementId: "G-QGBM5Q470X",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);

export { auth, db };
