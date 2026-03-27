import React, { useState } from 'react';
import { auth, db, messaging } from '../firebase'; 
import { getToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const NotificationManager = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleEnableNotifications = async () => {
    setLoading(true);
    setStatus('Requesting permission...');

    try {
      // 1. Request Browser Notification Permission
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // 2. Retrieve FCM Token
        // Replace 'YOUR_VAPID_KEY' with the key from Firebase Console > Project Settings > Cloud Messaging
        const currentToken = await getToken(messaging, {
          vapidKey: 'YOUR_VAPID_KEY_HERE',
        });

        if (currentToken) {
          const user = auth.currentUser;

          if (user) {
            // 3. Save or Update token in Firestore 'fcm_tokens' collection
            const tokenRef = doc(db, 'fcm_tokens', user.uid);
            
            await setDoc(
              tokenRef,
              {
                token: currentToken,
                uid: user.uid,
                updatedAt: serverTimestamp(),
                enabled: true,
              },
              { merge: true }
            );

            setStatus('Alerts enabled successfully!');
          } else {
            setStatus('User not authenticated.');
          }
        } else {
          setStatus('No registration token available.');
        }
      } else {
        setStatus('Permission denied.');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setStatus('Error: Could not enable alerts.');
    } finally {
      setLoading(false);
    }
  };

  const glassButtonStyle = {
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '12px 24px',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  };

  return (
    <div className="notification-container" style={{ padding: '20px' }}>
      <button
        onClick={handleEnableNotifications}
        disabled={loading}
        style={glassButtonStyle}
        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
        onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
      >
        <span className="material-icons">
          {status.includes('success') ? 'notifications_active' : 'notifications'}
        </span>
        {loading ? 'Processing...' : 'Enable Alerts'}
      </button>

      {status && (
        <p style={{ 
          marginTop: '10px', 
          fontSize: '0.85rem', 
          color: status.includes('Error') ? '#ff6b6b' : '#a8e6cf' 
        }}>
          {status}
        </p>
      )}
    </div>
  );
};

export default NotificationManager;