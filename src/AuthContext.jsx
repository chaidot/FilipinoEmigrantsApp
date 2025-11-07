// AuthContext.jsx
import React from 'react';
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext({ user: null, role: "viewer", loading: true });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, role: "viewer", loading: true });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, role: "viewer", loading: false });
        return;
      }
      // Read role from /users/{uid}
      const snap = await getDoc(doc(db, "users", user.uid));
      const role = snap.exists() ? (snap.data().role || "viewer") : "viewer";
      setState({ user, role, loading: false });
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  );
}
