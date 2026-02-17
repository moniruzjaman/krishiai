
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
  Auth
} from "firebase/auth";

/**
 * Updated Firebase Configuration
 * Using fertilizer-dealer project credentials
 */
const firebaseConfig = {
  apiKey: "AIzaSyCMRA3_SceO-iemeiMHh0Cyhu9T1BTd_-M",
  authDomain: "fertilizer-dealer.firebaseapp.com",
  databaseURL: "https://fertilizer-dealer.firebaseio.com",
  projectId: "fertilizer-dealer",
  storageBucket: "fertilizer-dealer.firebasestorage.app",
  messagingSenderId: "798390434310",
  appId: "1:798390434310:web:7483725f6a65d59a286187"
};

let app: FirebaseApp;
let auth: Auth;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}
auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Firebase Login Error:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Firebase Logout Error:", error);
    throw error;
  }
};

export const subscribeToAuthChanges = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
