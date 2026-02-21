import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUEF1eIEvU2_nsiooN3SCKpl18ez3UaxQ",
  authDomain: "manoel-farmacia.firebaseapp.com",
  projectId: "manoel-farmacia",
  storageBucket: "manoel-farmacia.firebasestorage.app",
  messagingSenderId: "566371095984",
  appId: "1:566371095984:web:d1ce5144af5415ff6e7275",
  measurementId: "G-DG8KFS2V8Z"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
