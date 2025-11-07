import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCMhZmvanOSIQCpv2OKii4L7Bu5U-Znc0E",
  authDomain: "filipinoemigrantsdb-fca70.firebaseapp.com",
  projectId: "filipinoemigrantsdb-fca70",
  storageBucket: "filipinoemigrantsdb-fca70.firebasestorage.app",
  messagingSenderId: "863101828251",
  appId: "1:863101828251:web:228947d0cc09f92c945a3e",
  measurementId: "G-L0GBBBPB6N"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
