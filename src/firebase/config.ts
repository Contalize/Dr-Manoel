import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDUEF1eIEvU2_nsiooN3SCKpl18ez3UaxQ",
  authDomain: "manoel-farmacia.firebaseapp.com",
  projectId: "manoel-farmacia",
  storageBucket: "manoel-farmacia.firebasestorage.app",
  messagingSenderId: "566371095984",
  appId: "1:566371095984:web:d1ce5144af5415ff6e7275",
  measurementId: "G-DG8KFS2V8Z"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize Analytics conditionally
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) getAnalytics(app);
  });
}

export { app, db, auth };
