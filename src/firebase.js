import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDoFTsr-2bq6OpweUXa8tpTply692uC5wE",
  authDomain: "filipinoemigrantsdb-be0c4.firebaseapp.com",
  projectId: "filipinoemigrantsdb-be0c4",
  storageBucket: "filipinoemigrantsdb-be0c4.firebasestorage.app",
  messagingSenderId: "501368971826",
  appId: "1:501368971826:web:64ef96901a4b1c6bfd522b",
  measurementId: "G-F07QDR0NVK"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
