import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: "agriadvisoryai.firebaseapp.com",
  projectId: "agriadvisoryai",
  storageBucket: "agriadvisoryai.firebasestorage.app",
  messagingSenderId: "498163867458",
  appId: "1:498163867458:web:d53de085f0f56acbc472db"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Test function to verify Firebase authentication
export async function testFirebaseAuth() {
  console.log("Testing Firebase Authentication...");

  try {
    // Example of how to use Firebase auth
    console.log("Firebase Auth initialized successfully");
    console.log("Current user:", auth.currentUser ? auth.currentUser.email : "Not signed in");

    return true;
  } catch (error) {
    console.error("Error testing Firebase Auth:", error);
    return false;
  }
}

// Export auth for use in other modules
export { auth };
