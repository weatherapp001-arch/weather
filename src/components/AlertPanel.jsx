import React, { useState, useEffect, useCallback } from 'react';
import emailjs from '@emailjs/browser';

// Firebase Imports
import { db, messaging, auth } from '../firebase/config.js'; 
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getToken } from "firebase/messaging";
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const AlertPanel = ({ searchQuery }) => {
  // Line 13: Your verified Admin UID[cite: 2]
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

  // Updated Line 33: Complete state tracking for UI and Email[cite: 2]
  const [formData, setFormData] = useState({
    city: currentCity,
    threat: "Initializing...",
    time: "--",
    temp: "--",
    aqi: "--",
    condition: "Waiting...",
    advice: "Click 'Update' to fetch the latest predictive data."
  });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- AUTH & ADMIN VERIFICATION ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setSilentUid(user.uid);
        // Force unlock admin on localhost or if UID matches[cite: 2]
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

  // --- FCM: Background Registration ---
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
          }
        }
      } catch (error) {
        console.error("FCM Sync Failed:", error);
      }
    };
    autoRegisterDevice();
  }, []);

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

  const saveContacts = async () => {
    if (!silentUid) return alert("⚠️ Authentication required.");
    setLoading(true);
    try {
      const docRef = doc(db, "alertSlots", silentUid);
      await setDoc(docRef, { list: contactsList }, { merge: true });
      alert("✅ Contacts successfully synced.");
    } catch (err) { 
      alert("❌ Failed to push contacts.");
    } finally {
      setLoading(false);
    }
  };

  const calculateUS_AQI = (pm25) => {
    if (!pm25) return 20;
    if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
    if (pm25 <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51);
    if (pm25 <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101);
    if (pm25 <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151);
    return 300;
  };

  const generateAdvancedAlert = (metrics) => {
    const alerts = [];
    if (metrics.aqi > 150) alerts.push(`⚠️ AQI: ${metrics.aqi} (Unhealthy).`);
    if (metrics.windSpeed > 17) alerts.push(`💨 High Winds detected.`);
    if (metrics.temp >= 40) alerts.push(`🔥 Extreme Heat Alert.`);

    if (alerts.length === 0) {
      return { 
        threat: "Safe (Next 3 Hrs)", 
        advice: `Target Local Time: ${metrics.time}. No significant atmospheric hazards predicted.` 
      };
    }
    return { threat: "Weather Warning", advice: `Predicted for ${metrics.time}: ` + alerts.join(" ") };
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (dispatchMode === 'broadcast') {
      if (!isVerifiedAdmin) return alert("❌ Admin access required.");
      setLoading(true);
      try {
        const user = auth.currentUser;
        const idToken = await user.getIdToken(true);
        const response = await fetch('/api/broadcast', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}` 
          },
          body: JSON.stringify({
            title: `🚨 EMERGENCY: ${formData.threat}`,
            body: `Alert for ${formData.city}: ${formData.advice}`
          }),
        });
        const result = await response.json();
        if (response.ok && result.success) alert(`🚀 Broadcast Sent!`);
      } catch (err) {
        alert(`❌ Dispatch Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Corrected Line 178: Mapping all missing fields to EmailJS[cite: 2]
      if (selectedEmails.length === 0) return alert("⚠️ Select a recipient.");
      setLoading(true);
      emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          to_emails: selectedEmails.join(","),
          city: formData.city,
          threat: formData.threat,
          condition: formData.condition, 
          temp: formData.temp,           
          aqi: formData.aqi,             
          advice: formData.advice
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      ).then(() => alert("✅ Detailed Email Sent!"))
       .catch(() => alert("❌ Email Failed."))
       .finally(() => setLoading(false));
    }
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
      const wUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(targetCity === 'Prayagraj' ? 'Allahabad' : targetCity)}&units=metric&appid=${WEATHER_KEY}`;
      const wRes = await fetch(wUrl);
      const wData = await wRes.json();
      const { lat, lon } = wData.city.coord;

      const aqiRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}`);
      const aqiData = await aqiRes.json();

      // Look-ahead window shifted to 3 hours (10,800 seconds)[cite: 2]
      const targetSeconds = Math.floor(Date.now() / 1000) + 10800; 
      const futureWeather = wData.list.reduce((prev, curr) => Math.abs(curr.dt - targetSeconds) < Math.abs(prev.dt - targetSeconds) ? curr : prev);
      const futureAQI = aqiData.list.reduce((prev, curr) => Math.abs(curr.dt - targetSeconds) < Math.abs(prev.dt - targetSeconds) ? curr : prev);

      const actualAQI = calculateUS_AQI(futureAQI.components.pm2_5);
      const forecastTime = formatCityTime(futureWeather.dt, wData.city.timezone);
      const alertInfo = generateAdvancedAlert({ aqi: actualAQI, time: forecastTime, windSpeed: futureWeather.wind.speed, temp: futureWeather.main.temp });

      setFormData({
        city: targetCity,
        time: forecastTime,
        temp: `${Math.round(futureWeather.main.temp)}°C`,
        aqi: actualAQI,
        condition: futureWeather.weather[0].main,
        threat: alertInfo.threat,
        advice: alertInfo.advice
      });
    } catch (err) {
      setFormData(prev => ({ ...prev, threat: "Sync Interrupted" }));
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
        </div>

        <form onSubmit={handleDispatch} style={formStyle}>
          {/* Dispatch Section with Restore Toggle Button[cite: 2] */}
          <div style={innerSectionStyle}>
            <div style={sectionTopRowStyle}>
              <h4 style={labelStyle}>
                <span className="material-symbols-outlined">
                  {dispatchMode === 'email' ? 'mail' : 'cell_tower'}
                </span> 
                1. {dispatchMode === 'email' ? 'Email Dispatch' : 'Broadcast'}
              </h4>
              
              {isVerifiedAdmin && (
                <div style={toggleContainerStyle}>
                  <button type="button" onClick={() => setDispatchMode('email')} style={dispatchMode === 'email' ? activeToggleStyle : inactiveToggleStyle}>Email</button>
                  <button type="button" onClick={() => setDispatchMode('broadcast')} style={dispatchMode === 'broadcast' ? activeToggleStyle : inactiveToggleStyle}>Broadcast</button>
                </div>
              )}
            </div>
            
            {dispatchMode === 'email' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px' }}>
                  <button type="button" onClick={fetchContacts} style={syncBtnStyle}>Pull</button>
                  <button type="button" onClick={saveContacts} style={saveBtnStyle}>Push</button>
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
                <span className="material-symbols-outlined" style={{ fontSize: '42px', color: '#ff4d4d' }}>sensors</span>
                <p style={{ margin: '10px 0 5px 0', fontWeight: 'bold', color: '#ff4d4d' }}>BROADCAST MODE ACTIVE</p>
                <p style={{ fontSize: '12px', opacity: 0.7 }}>Message will be sent to all subscribed FCM tokens.</p>
              </div>
            )}
          </div>

          {/* Variables Grid[cite: 2] */}
          <div style={innerSectionStyle}>
            <div style={sectionTopRowStyle}>
              <h4 style={labelStyle}>2. Variables</h4>
              <button type="button" onClick={() => fetchEnvironmentalData(currentCity)} style={syncBtnStyle}>Update</button>
            </div>
            <div style={variableGrid}>
              <input name="city" value={formData.city} onChange={handleFormChange} style={editableInputStyle} placeholder="City" />
              <input name="threat" value={formData.threat} onChange={handleFormChange} style={editableInputStyle} placeholder="Threat" />
              <input name="condition" value={formData.condition} onChange={handleFormChange} style={editableInputStyle} placeholder="Condition" />
              <input name="temp" value={`${formData.temp} (AQI: ${formData.aqi})`} readOnly style={editableInputStyle} placeholder="Temp/AQI" />
              
              <div style={textareaGroupStyle}>
                <textarea name="advice" value={formData.advice} onChange={handleFormChange} style={editableTextareaStyle} rows="3" />
              </div>
            </div>
          </div>

          <button type="submit" style={dispatchBtnStyle}>
            {dispatchMode === 'email' ? 'Send Emergency Emails' : 'Trigger Global Broadcast'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- STYLES[cite: 2] ---
const viewportStyle = { height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '20px 0', paddingBottom: '60px' };
const cardStyle = { width: '90%', maxWidth: '600px', padding: '25px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', marginBottom: '30px' };
const headerContainerStyle = { borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '20px' };
const headerStyle = { display: 'flex', alignItems: 'center', gap: '12px', color: '#ff4d4d', margin: 0 };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px' };
const innerSectionStyle = { background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' };
const sectionTopRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' };
const labelStyle = { margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8 };
const syncBtnStyle = { display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid #A3E4D7', color: '#A3E4D7', padding: '4px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' };
const saveBtnStyle = { display: 'flex', alignItems: 'center', gap: '4px', background: '#A3E4D7', border: '1px solid #A3E4D7', color: 'black', padding: '4px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' };
const variableGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' };
const editableInputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', padding: '10px', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' };
const textareaGroupStyle = { position: 'relative', display: 'flex', gridColumn: '1 / -1' };
const editableTextareaStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', padding: '10px', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', resize: 'vertical', minHeight: '60px' };
const dispatchBtnStyle = { padding: '15px', background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', marginTop: '10px' };
const inputStyle = { flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '6px', color: 'white' };
const addBtnStyle = { padding: '0 15px', background: '#A3E4D7', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', color: 'black' };
const scrollContainer = { maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' };
const contactItemStyle = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', padding: '4px', cursor: 'pointer' };
const inputContainerStyle = { display: 'flex', gap: '10px', marginTop: '10px' };
const loaderOverlayStyle = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: '20px', color: '#A3E4D7', fontWeight: 'bold' };
const toggleContainerStyle = { display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '8px', gap: '5px' };
const activeToggleStyle = { background: '#ff4d4d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
const inactiveToggleStyle = { background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', padding: '6px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' };
const broadcastNoticeStyle = { textAlign: 'center', padding: '20px', background: 'rgba(255,77,77,0.05)', borderRadius: '8px', border: '1px dashed rgba(255,77,77,0.5)' };

export default AlertPanel;