import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from './config'; 

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const AuthContext = createContext();

// Your verified Admin UID [cite: 159]
const ADMIN_UID = 'eurBOkHyrMMbeti2vzGKPpqFDO13';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Updated Sign In: Frictionless Google Popup [cite: 161]
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const loggedUser = result.user;

      // Register user email in 'subscribers' collection immediately
      const userRef = doc(db, "subscribers", loggedUser.uid);
      await setDoc(userRef, {
        email: loggedUser.email,
        displayName: loggedUser.displayName,
        lastLogin: serverTimestamp(),
        status: "active"
      }, { merge: true });

      return loggedUser;
    } catch (error) {
      console.error("Login Error:", error.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error.message);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user ? user.uid === ADMIN_UID : false;

  const value = { user, isAdmin, loginWithGoogle, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};