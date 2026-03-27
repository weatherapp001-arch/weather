// File: src/components/AlertSlots.jsx
// Line: 1
import { useState, useEffect } from 'react';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase'; 

// Element Name: AlertSlots Component
export const AlertSlots = () => {
  const [contactEmail, setContactEmail] = useState('');
  const [silentUid, setSilentUid] = useState(null);

  // Function: initializeSilentSession
  useEffect(() => {
    const initializeSilentSession = async () => {
      try {
        // Silently assigns an ID to the browser without prompting the user
        const userCredential = await signInAnonymously(auth);
        setSilentUid(userCredential.user.uid);
      } catch (error) {
        console.error("Silent Auth Error:", error.message);
      }
    };
    initializeSilentSession();
  }, []);

  // Function: handleSaveContact
  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!silentUid) return;

    try {
      const slotRef = doc(db, 'alertSlots', silentUid);
      
      // Line: 36 (Error causing line if Firestore rules reject the silent UID match)
      await setDoc(slotRef, {
        emails: arrayUnion(contactEmail)
      }, { merge: true });

      setContactEmail('');
      console.log("Contact safely stored in private slot!");
    } catch (error) {
      console.error("Database Error:", error.message);
    }
  };

  // Element Name: Frictionless Form UI
  return (
    <div className="alert-slot-container">
      <h3>Emergency Contacts</h3>
      <form onSubmit={handleSaveContact}>
        <div className="input-box">
          <span className="material-symbols-outlined">alternate_email</span>
          <input 
            type="email" 
            placeholder="Friend/Family Email..." 
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit">
          <span className="material-symbols-outlined">save</span>
          Save to Slot
        </button>
      </form>
    </div>
  );
};