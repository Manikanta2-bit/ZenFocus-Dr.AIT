// Import the Firebase SDK modules (modular v9 ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithRedirect,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  enableIndexedDbPersistence,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCy_mdsbk9uZBUlBf3fT7HecaYZUGhA0Qc",
  authDomain: "zenfocus-student-app.firebaseapp.com",
  projectId: "zenfocus-student-app",
  storageBucket: "zenfocus-student-app.firebasestorage.app",
  messagingSenderId: "665666924464",
  appId: "1:665666924464:web:b3437576a877646f313075"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Export commonly used functions/instances so other modules can import them
export {
  auth,
  db,
  provider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithRedirect,
  getRedirectResult,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  enableIndexedDbPersistence,
  getDoc,
  setDoc
};
