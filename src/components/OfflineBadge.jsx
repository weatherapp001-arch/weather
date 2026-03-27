// src/components/OfflineBadge.jsx

import React, { useState, useEffect } from 'react';

const OfflineBadge = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const lastSaved = localStorage.getItem('lastSavedAt');

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={{
      padding: '10px 20px',
      backgroundColor: '#ff9800',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      borderRadius: '8px',
      margin: '10px 0',
      gap: '10px'
    }}>
      <span className="material-symbols-outlined">cloud_off</span>
      <div>
        <p style={{ margin: 0, fontWeight: 'bold' }}>Viewing Offline Data</p>
        {lastSaved && (
          <small>Last updated: {new Date(lastSaved).toLocaleTimeString()}</small>
        )}
      </div>
    </div>
  );
};

export default OfflineBadge;