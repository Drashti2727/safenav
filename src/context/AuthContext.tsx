import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserPreferences, EmergencyContact } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsDemo: (name?: string, email?: string) => void;
  signOutUser: () => Promise<void>;
  updateUserPreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  updateUserEmergencyContacts: (contacts: EmergencyContact[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Default travel and safety preferences code
  const defaultPrefs: UserPreferences = {
    theme: 'dark',
    travelMode: 'WALKING',
    litPref: true,
    crowdedPref: true,
    avoidIsolated: true
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync user profile with Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Setup a new profile
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Traveler',
              createdAt: new Date().toISOString(),
              emergencyContacts: [],
              preferences: defaultPrefs
            };
            
            // Strictly validate structure via setDoc
            await setDoc(userDocRef, {
              email: newProfile.email,
              displayName: newProfile.displayName,
              createdAt: serverTimestamp(), // Stored as native Timestamp
              preferences: defaultPrefs,
              emergencyContacts: []
            });
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Firestore user fetch failed, setting mock profile:", error);
          // Fallback state if firestore rules prevent access or during setup
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'Traveler',
            createdAt: new Date().toISOString(),
            emergencyContacts: [],
            preferences: defaultPrefs
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Popup login error:", error);
      // Construct an extremely clear, precise iframe error explanation
      if (error && (error.code === 'auth/popup-blocked' || error.message?.includes('popup') || error.code?.includes('iframe') || error.message?.includes('iframe'))) {
        throw new Error(
          "Iframe Google Login Blocked: Most browsers block popups inside embedded environments. Please click the 'Open in new tab' button at the top-right of the window to log in via Google, or choose 'Sign In with Demo Account' below to explore immediately."
        );
      }
      throw new Error(error instanceof Error ? error.message : "Google Sign-In was cancelled or blocked by browser settings.");
    }
  };

  const signInAsDemo = (name: string = "Drashti Patel", email: string = "pdrashti2705@gmail.com") => {
    const mockUser = {
      uid: 'demo_user_123',
      email: email,
      displayName: name,
      emailVerified: true,
      isAnonymous: false,
      providerData: [{
        providerId: 'google.com',
        uid: 'demo_user_123',
        displayName: name,
        email: email,
        phoneNumber: null,
        photoURL: null
      }]
    } as any;
    
    setUser(mockUser);
    setProfile({
      uid: mockUser.uid,
      email: mockUser.email,
      displayName: mockUser.displayName,
      createdAt: new Date().toISOString(),
      emergencyContacts: [],
      preferences: defaultPrefs
    });
  };

  const signOutUser = async () => {
    try {
      // Clear mock set values
      setUser(null);
      setProfile(null);
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateUserPreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!user || !profile) return;
    const path = `users/${user.uid}`;
    const updatedPreferences = { ...(profile.preferences || defaultPrefs), ...newPrefs };
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        preferences: updatedPreferences
      });
      setProfile(prev => prev ? { ...prev, preferences: updatedPreferences } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const updateUserEmergencyContacts = async (newContacts: EmergencyContact[]) => {
    if (!user || !profile) return;
    const path = `users/${user.uid}`;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        emergencyContacts: newContacts
      });
      setProfile(prev => prev ? { ...prev, emergencyContacts: newContacts } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signInWithGoogle,
      signInAsDemo,
      signOutUser,
      updateUserPreferences,
      updateUserEmergencyContacts
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
