import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect 
} from 'react';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { app } from './config'; // Assuming your Firebase init is in config.js

// 1. Initialize Firebase Auth and Provider
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 2. Create Context
const AuthContext = createContext();

// 3. Admin Configuration
const ADMIN_UID = 'eurBOkHyrMMbeti2vzGKPpqFDO13'; // Replace with your actual UID from Firebase Console

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign In Function
  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error.message);
    }
  };

  // Logout Function
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error.message);
    }
  };

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Determine Admin Status
  const isAdmin = user ? user.uid === ADMIN_UID : false;

  const value = {
    user,
    isAdmin,
    loginWithGoogle,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 4. Custom Hook for easy access
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};