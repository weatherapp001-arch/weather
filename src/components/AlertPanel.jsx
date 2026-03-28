import React, { useState, useEffect, useCallback } from 'react';
import emailjs from '@emailjs/browser';

// Firebase Imports
import { db, messaging, auth } from '../firebase/config.js'; 
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getToken } from "firebase/messaging";
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const AlertPanel = ({ searchQuery }) => {
  // Line 13: Your verified Admin UID
  const MASTER_ADMIN_UID = "eurBOkHyrMMbeti2vzGKPpqFDO13";
  const WEATHER_KEY = import.meta.env.VITE_WEATHER_API_KEY;

  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [contactsList, setContactsList] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [dispatchMode, setDispatchMode] = useState('email'); 
  const [silentUid, setSilentUid] = useState(null);

  let rawCity = "Prayagraj";
  if (typeof searchQuery === 'string' && searchQuery.trim() !== '') {
    rawCity = searchQuery;
  } else if (searchQuery?.name) {
    rawCity = searchQuery.name;
  } else if (searchQuery?.city) {
    rawCity = searchQuery.city;
  }
  const currentCity = rawCity.replace(/\+/g, ' ').trim();

  const [formData, setFormData] = useState({
    city: currentCity,
    threat: "Initializing...",
    time: "--",
    temp: "--",
    condition: "Waiting...",
    advice: "Click 'Update' to fetch the latest predictive data."
  });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- AUTH & ADMIN VERIFICATION ---
  // Line 51: Updated to Force Unlock Admin on Localhost for testing
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setSilentUid(user.uid);
        // Unlock if UID matches OR if testing on localhost
        if (user.uid === MASTER_ADMIN_UID || window.location.hostname === "localhost") {
          setIsVerifiedAdmin(true);
        }
      } else {
        try {
          const userCredential = await signInAnonymously(auth);
          setSilentUid(userCredential.user.uid);
        } catch (error) {
          console.error("Auth Error:", error.message);
        }
      }
    });

    return () => unsubscribe();
  }, [MASTER_ADMIN_UID]);

  // --- FCM: Automated Background Registration ---
  useEffect(() => {
    const autoRegisterDevice = async () => {
      try {
        if (!("Notification" in window)) return;
        if (Notification.permission === 'granted') {
          const token = await getToken(messaging, { 
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
          });

          if (token) {
            const tokenRef = doc(db, "fcm_tokens", token.substring(0, 20));
            await setDoc(tokenRef, {
              token: token,
              lastSeen: new Date(),
              device: navigator.userAgent
            }, { merge: true });
            console.log("📡 Device Auto-Synced.");
          }
        }
      } catch (error) {
        console.error("FCM Sync Failed:", error);
      }
    };
    autoRegisterDevice();
  }, []);

  // --- SECURITY: Force Reset Dispatch Mode ---
  useEffect(() => {
    if (!isVerifiedAdmin && dispatchMode === 'broadcast') {
      setDispatchMode('email');
    }
  }, [isVerifiedAdmin, dispatchMode]);

  // --- FIRESTORE: Fetch Contacts ---
  const fetchContacts = useCallback(async () => {
    if (!silentUid) return; 
    setLoading(true);
    try {
      const docRef = doc(db, "alertSlots", silentUid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setContactsList(docSnap.data().list || []);
      } else {
        setContactsList([]);
      }
    } catch (err) { 
      console.error("Pull Error:", err); 
    } finally {
      setLoading(false);
    }
  }, [silentUid]);

  // --- LOGIC: Handle Dispatch ---
  // Line 128: Added improved response handling to prevent JSON errors
  const handleDispatch = async (e) => {
    e.preventDefault();
    if (dispatchMode === 'broadcast') {
      if (!isVerifiedAdmin) return alert("❌ Admin access required.");
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Authentication required.");
        const idToken = await user.getIdToken(true);

        const response = await fetch('/api/broadcast', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}` 
          },
          body: JSON.stringify({
            title: `🚨 EMERGENCY: ${formData.threat}`,
            body: formData.advice
          }),
        });

        // Line 152: Safer JSON parsing
        const text = await response.text();
        const result = text ? JSON.parse(text) : {};

        if (response.ok && result.success) {
          alert(`🚀 Broadcast Successful! Sent to ${result.sentCount} devices.`);
        } else {
          throw new Error(result.error || "Broadcast rejected.");
        }
      } catch (err) {
        alert(`❌ Dispatch Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Email Logic...
      if (selectedEmails.length === 0) return alert("⚠️ Select a recipient.");
      setLoading(true);
      emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          to_emails: selectedEmails.join(","),
          city: formData.city,
          threat: formData.threat,
          advice: formData.advice
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      ).then(() => alert("✅ Email Sent!"))
       .catch(() => alert("❌ Email Failed."))
       .finally(() => setLoading(false));
    }
  };

  // --- HELPERS (AQI, Time, Weather) ---
  const calculateUS_AQI = (pm25) => {
    if (!pm25) return 20; 
    if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
    if (pm25 <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51);
    return 150; 
  };

  const formatCityTime = (dtUTC, timezoneOffsetSeconds) => {
    const localDate = new Date((dtUTC + timezoneOffsetSeconds) * 1000);
    let hours = localDate.getUTCHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; 
    const mins = localDate.getUTCMinutes();
    return `${hours}:${mins < 10 ? '0'+mins : mins} ${ampm}`;
  };

  const fetchEnvironmentalData = useCallback(async (targetCity) => {
    if (!targetCity || !WEATHER_KEY) return;
    setLoading(true);
    try {
      const wUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(targetCity)}&units=metric&appid=${WEATHER_KEY}`;
      const wRes = await fetch(wUrl);
      const wData = await wRes.json();
      
      const aqiRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${wData.city.coord.lat}&lon=${wData.city.coord.lon}&appid=${WEATHER_KEY}`);
      const aqiData = await aqiRes.json();

      const futureWeather = wData.list[1];
      const actualAQI = calculateUS_AQI(aqiData.list[0].components.pm2_5);
      const forecastTime = formatCityTime(futureWeather.dt, wData.city.timezone);

      setFormData({
        city: targetCity,
        time: forecastTime,
        temp: `${Math.round(futureWeather.main.temp)}°C`,
        condition: futureWeather.weather[0].main,
        threat: actualAQI > 100 ? "Toxic Air" : "Safe",
        advice: actualAQI > 100 ? "Wear a mask." : "Conditions clear."
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [WEATHER_KEY]);

  useEffect(() => {
    fetchContacts();
    fetchEnvironmentalData(currentCity);
  }, [currentCity, fetchContacts, fetchEnvironmentalData]);

  return (
    <div className="alert-view-container hide-scroll" style={viewportStyle}>
      <div className="glass-card" style={cardStyle}>
        
        {loading && (
          <div style={loaderOverlayStyle}>
             <span className="material-symbols-outlined" style={{ fontSize: '48px', animation: 'spin 2s linear infinite' }}>sync</span>
             <p style={{marginTop: '10px'}}>Syncing Systems...</p>
          </div>
        )}

        <div style={headerContainerStyle}>
          <h2 style={headerStyle}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>emergency_home</span>
            Emergency Dispatch System
          </h2>
          <p style={{ fontSize: '12px', opacity: 0.7, margin: '5px 0 0 0' }}>
            {isVerifiedAdmin ? "ADMIN CONTROL UNLOCKED" : "STANDARD DISPATCH MODE"}
          </p>
        </div>

        <form onSubmit={handleDispatch} style={formStyle}>
          <div style={innerSectionStyle}>
            <div style={sectionTopRowStyle}>
              <h4 style={labelStyle}>
                <span className="material-symbols-outlined">network_manage</span> 1. Dispatch Mode
              </h4>
              
              {isVerifiedAdmin ? (
                <div style={toggleContainerStyle}>
                  <button type="button" onClick={() => setDispatchMode('email')} style={dispatchMode === 'email' ? activeToggleStyle : inactiveToggleStyle}>
                    Emails
                  </button>
                  <button type="button" onClick={() => setDispatchMode('broadcast')} style={dispatchMode === 'broadcast' ? activeToggleStyle : inactiveToggleStyle}>
                    Broadcast
                  </button>
                </div>
              ) : (
                <div style={{ color: '#aaa', fontSize: '12px' }}>Email Only</div>
              )}
            </div>
            
            {dispatchMode === 'email' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px' }}>
                  <button type="button" onClick={fetchContacts} style={syncBtnStyle}>Pull</button>
                  <button type="button" onClick={() => {}} style={saveBtnStyle}>Push</button>
                </div>
                <div className="hide-scroll" style={scrollContainer}>
                  {contactsList.map(email => (
                    <label key={email} style={contactItemStyle}>
                      <input type="checkbox" onChange={(e) => setSelectedEmails(prev => e.target.checked ? [...prev, email] : prev.filter(i => i !== email))} />
                      {email}
                    </label>
                  ))}
                </div>
                <div style={inputContainerStyle}>
                  <input type="email" placeholder="New email..." value={newEmail} onChange={e => setNewEmail(e.target.value)} style={inputStyle} />
                  <button type="button" onClick={() => { if(newEmail) { setContactsList([...contactsList, newEmail]); setNewEmail(""); } }} style={addBtnStyle}>Add</button>
                </div>
              </>
            ) : (
              <div style={broadcastNoticeStyle}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#ff4d4d' }}>cell_tower</span>
                <p style={{ margin: '10px 0 0 0', fontWeight: 'bold' }}>Broadcast Active</p>
                <p style={{ fontSize: '12px', opacity: 0.6 }}>Background Syncing is live.</p>
              </div>
            )}
          </div>

          <div style={innerSectionStyle}>
            <div style={sectionTopRowStyle}>
              <h4 style={labelStyle}>Variables</h4>
              <button type="button" onClick={() => fetchEnvironmentalData(currentCity)} style={syncBtnStyle}>Update</button>
            </div>
            <div style={variableGrid}>
              <div style={inputGroupStyle}>
                <input name="city" value={formData.city} onChange={handleFormChange} style={editableInputStyle} />
              </div>
              <div style={inputGroupStyle}>
                <input name="threat" value={formData.threat} onChange={handleFormChange} style={editableInputStyle} />
              </div>
              <div style={textareaGroupStyle}>
                <textarea name="advice" value={formData.advice} onChange={handleFormChange} style={editableTextareaStyle} rows="3" />
              </div>
            </div>
          </div>

          <button type="submit" style={dispatchBtnStyle}>
            {dispatchMode === 'email' ? 'Send Emails' : 'Send Broadcast'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- STYLES ---
const viewportStyle = {
  height: '100%',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  overflowY: 'auto',
  padding: '20px 0',
  paddingBottom: '60px'
};

const cardStyle = {
  width: '90%',
  maxWidth: '600px',
  padding: '25px',
  borderRadius: '20px',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(15px)',
  border: '1px solid rgba(255,255,255,0.1)',
  position: 'relative',
  marginBottom: '30px'
};

const headerContainerStyle = {
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  paddingBottom: '15px',
  marginBottom: '20px'
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: '#ff4d4d',
  margin: 0
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '15px'
};

const innerSectionStyle = {
  background: 'rgba(0,0,0,0.2)',
  padding: '15px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.05)'
};

const sectionTopRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '10px'
};

const labelStyle = {
  margin: 0,
  fontSize: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  opacity: 0.8
};

const toggleContainerStyle = {
  display: 'flex',
  background: 'rgba(0,0,0,0.4)',
  padding: '4px',
  borderRadius: '8px',
  gap: '5px'
};

const activeToggleStyle = {
  background: '#ff4d4d',
  color: 'white',
  border: 'none',
  padding: '6px 12px',
  borderRadius: '5px',
  fontSize: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
};

const inactiveToggleStyle = {
  background: 'transparent',
  color: 'rgba(255,255,255,0.6)',
  border: 'none',
  padding: '6px 12px',
  borderRadius: '5px',
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
};

const broadcastNoticeStyle = {
  textAlign: 'center',
  padding: '20px',
  background: 'rgba(255,77,77,0.05)',
  borderRadius: '8px',
  border: '1px dashed rgba(255,77,77,0.5)'
};

const scrollContainer = {
  maxHeight: '100px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const variableGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px'
};

const inputGroupStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center'
};

const iconInsideStyle = {
  position: 'absolute',
  left: '10px',
  color: 'rgba(255,255,255,0.7)',
  pointerEvents: 'none',
  fontSize: '18px'
};

const editableInputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.2)',
  padding: '10px 10px 10px 35px',
  borderRadius: '8px',
  color: 'white',
  fontSize: '13px',
  outline: 'none'
};

const textareaGroupStyle = {
  position: 'relative',
  display: 'flex',
  gridColumn: '1 / -1'
};

const iconInsideTextareaStyle = {
  position: 'absolute',
  left: '10px',
  top: '12px',
  color: 'rgba(255,255,255,0.7)',
  pointerEvents: 'none',
  fontSize: '18px'
};

const editableTextareaStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.2)',
  padding: '10px 10px 10px 35px',
  borderRadius: '8px',
  color: 'white',
  fontSize: '13px',
  outline: 'none',
  resize: 'vertical',
  minHeight: '60px'
};

const inputContainerStyle = {
  display: 'flex',
  gap: '10px',
  marginTop: '10px'
};

const inputStyle = {
  flex: 1,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  padding: '8px',
  borderRadius: '6px',
  color: 'white'
};

const addBtnStyle = {
  padding: '0 15px',
  background: '#A3E4D7',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer',
  color: 'black'
};

const syncBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  background: 'transparent',
  border: '1px solid #A3E4D7',
  color: '#A3E4D7',
  padding: '4px 10px',
  borderRadius: '5px',
  fontSize: '12px',
  cursor: 'pointer'
};

const saveBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  background: '#A3E4D7',
  border: '1px solid #A3E4D7',
  color: 'black',
  padding: '4px 10px',
  borderRadius: '5px',
  fontSize: '12px',
  cursor: 'pointer',
  fontWeight: 'bold'
};

const dispatchBtnStyle = {
  padding: '15px',
  background: '#ff4d4d',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '16px',
  marginTop: '10px'
};

const contactItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '13px',
  padding: '4px',
  cursor: 'pointer'
};

const loaderOverlayStyle = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.85)',
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: '20px',
  color: '#A3E4D7',
  fontWeight: 'bold'
};

export default AlertPanel;