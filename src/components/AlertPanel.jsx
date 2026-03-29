import React, { useState, useEffect, useCallback } from 'react';
import emailjs from '@emailjs/browser';
import { db, messaging, auth } from '../firebase/config.js'; 
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getToken } from "firebase/messaging";
import { useAuth } from '../firebase/auth'; // Centralized Auth Context [cite: 168]

const AlertPanel = ({ searchQuery }) => {
  // Line 11: Access global Auth state and isAdmin check [cite: 165, 166]
  const { user, isAdmin, loading, loginWithGoogle } = useAuth();
  const WEATHER_KEY = import.meta.env.VITE_WEATHER_API_KEY;

  const [contactsList, setContactsList] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dispatchMode, setDispatchMode] = useState('email'); 

  // Line 21: Determine city from search query [cite: 52-54]
  let rawCity = "Prayagraj";
  if (typeof searchQuery === 'string' && searchQuery.trim() !== '') {
    rawCity = searchQuery;
  } else if (searchQuery?.name) {
    rawCity = searchQuery.name;
  } else if (searchQuery?.city) {
    rawCity = searchQuery.city;
  }
  const currentCity = rawCity.replace(/\+/g, ' ').trim();

  // Line 33: Weather data state [cite: 55]
  const [formData, setFormData] = useState({
    city: currentCity,
    threat: "Initializing...",
    time: "--",
    temp: "--",
    aqi: "--",
    condition: "Waiting...",
    advice: "Fetch data to begin."
  });

  // Line 44: Trigger login popup only if no user is found and not already loading
  useEffect(() => {
    if (!loading && !user) {
      loginWithGoogle();
    }
  }, [user, loading, loginWithGoogle]);

  // Line 51: FCM Device Registration - Links Token to User Email [cite: 60, 61, 150]
  useEffect(() => {
    const syncDeviceToken = async () => {
      if (!user) return;
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, { 
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
          });

          if (token) {
            const tokenRef = doc(db, "fcm_tokens", token.substring(0, 20));
            await setDoc(tokenRef, {
              token: token,
              uid: user.uid,
              email: user.email, // Saves user email for broadcast identification
              lastSeen: serverTimestamp(),
              device: navigator.userAgent
            }, { merge: true });
          }
        }
      } catch (error) {
        console.error("Token sync failed:", error);
      }
    };
    syncDeviceToken();
  }, [user]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Line 83: AQI Calculation Logic [cite: 69-73]
  const calculateUS_AQI = (pm25) => {
    if (!pm25) return 20;
    if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
    if (pm25 <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51);
    if (pm25 <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101);
    if (pm25 <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151);
    return 300;
  };

  // Line 93: Logic to generate threat level based on weather metrics [cite: 75-78]
  const generateAdvancedAlert = (metrics) => {
    const alerts = [];
    if (metrics.aqi > 150) alerts.push(`⚠️ AQI: ${metrics.aqi} (Unhealthy).`);
    if (metrics.windSpeed > 17) alerts.push(`💨 High Winds.`);
    if (metrics.temp >= 40) alerts.push(`🔥 Extreme Heat.`);

    if (alerts.length === 0) {
      return { 
        threat: "Safe", 
        advice: `Local Time: ${metrics.time}. No significant hazards predicted.` 
      };
    }
    return { threat: "Weather Warning", advice: `Predicted for ${metrics.time}: ` + alerts.join(" ") };
  };

  // Line 110: Dispatcher handles both EmailJS and Serverless Broadcast [cite: 79-89]
  const handleDispatch = async (e) => {
    e.preventDefault();
    if (dispatchMode === 'broadcast') {
      if (!isAdmin) return alert("❌ Access Restricted to Admin.");
      setIsProcessing(true);
      try {
        const idToken = await auth.currentUser.getIdToken(true);
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
        if (response.ok && result.success) alert(`🚀 Global Broadcast Triggered!`);
      } catch (err) {
        alert(`❌ Dispatch Error: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    } else {
      if (selectedEmails.length === 0) return alert("⚠️ Select a recipient.");
      setIsProcessing(true);
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
      ).then(() => alert("✅ Emails Dispatched!"))
       .finally(() => setIsProcessing(false));
    }
  };

  const fetchContacts = useCallback(async () => {
    if (!user) return; 
    setIsProcessing(true);
    try {
      const docRef = doc(db, "alertSlots", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setContactsList(docSnap.data().list || []);
      }
    } catch (err) { 
      console.error("Fetch Error:", err); 
    } finally {
      setIsProcessing(false);
    }
  }, [user]);

  const saveContacts = async () => {
    if (!user) return alert("⚠️ Authentication required.");
    setIsProcessing(true);
    try {
      const docRef = doc(db, "alertSlots", user.uid);
      await setDoc(docRef, { list: contactsList }, { merge: true });
      alert("✅ Contacts Updated.");
    } catch (err) { 
      alert("❌ Sync Failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchEnvironmentalData = useCallback(async (targetCity) => {
    if (!targetCity || !WEATHER_KEY) return;
    setIsProcessing(true);
    try {
      const wUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(targetCity)}&units=metric&appid=${WEATHER_KEY}`;
      const wRes = await fetch(wUrl);
      const wData = await wRes.json();
      const { lat, lon } = wData.city.coord;

      const aqiRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}`);
      const aqiData = await aqiRes.json();

      const targetSeconds = Math.floor(Date.now() / 1000) + 10800; 
      const futureWeather = wData.list.reduce((prev, curr) => Math.abs(curr.dt - targetSeconds) < Math.abs(prev.dt - targetSeconds) ? curr : prev);
      const futureAQI = aqiData.list.reduce((prev, curr) => Math.abs(curr.dt - targetSeconds) < Math.abs(prev.dt - targetSeconds) ? curr : prev);

      const actualAQI = calculateUS_AQI(futureAQI.components.pm2_5);
      const alertInfo = generateAdvancedAlert({ aqi: actualAQI, time: "3hr Forecast", windSpeed: futureWeather.wind.speed, temp: futureWeather.main.temp });

      setFormData(prev => ({
        ...prev,
        temp: `${Math.round(futureWeather.main.temp)}°C`,
        aqi: actualAQI,
        condition: futureWeather.weather[0].main,
        threat: alertInfo.threat,
        advice: alertInfo.advice
      }));
    } catch (err) {
      console.error("Weather Sync Error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [WEATHER_KEY]);

  useEffect(() => {
    fetchContacts();
    fetchEnvironmentalData(currentCity);
  }, [currentCity, fetchContacts, fetchEnvironmentalData]);

  return (
    <div className="alert-view-container hide-scroll">
      <div className="glass-card">
        {isProcessing && <div><span>sync</span><p>Processing...</p></div>}

        <div>
          <h2><span>emergency_home</span> Emergency Dispatch System</h2>
          <p>Logged as: {user?.email || 'Verifying...'}</p>
        </div>

        <form onSubmit={handleDispatch}>
          <div>
            <div>
              <h4><span>{dispatchMode === 'email' ? 'mail' : 'cell_tower'}</span> 1. Mode</h4>
              {/* Line 233: Broadcast toggle only visible to verified Admin [cite: 105, 106] */}
              {isAdmin && (
                <div>
                  <button type="button" onClick={() => setDispatchMode('email')}>Email</button>
                  <button type="button" onClick={() => setDispatchMode('broadcast')}>Broadcast</button>
                </div>
              )}
            </div>
            
            {dispatchMode === 'email' ? (
              <>
                <div>
                  <button type="button" onClick={fetchContacts}>Pull</button>
                  <button type="button" onClick={saveContacts}>Push</button>
                </div>
                <div>
                  {contactsList.map(email => (
                    <label key={email}>
                      <input type="checkbox" onChange={(e) => setSelectedEmails(prev => e.target.checked ? [...prev, email] : prev.filter(i => i !== email))} />
                      {email}
                    </label>
                  ))}
                </div>
                <div>
                  <input type="email" placeholder="Add email..." value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                  <button type="button" onClick={() => { if(newEmail) { setContactsList([...contactsList, newEmail]); setNewEmail(""); } }}>Add</button>
                </div>
              </>
            ) : (
              <div>
                <span>sensors</span>
                <p>BROADCAST MODE ACTIVE</p>
                <p>Alerts will be pushed to all registered devices and user emails.</p>
              </div>
            )}
          </div>

          <div>
            <div>
              <h4>2. Variables</h4>
              <button type="button" onClick={() => fetchEnvironmentalData(currentCity)}>Update</button>
            </div>
            <div>
              <input name="city" value={formData.city} onChange={handleFormChange} placeholder="City" />
              <input name="threat" value={formData.threat} onChange={handleFormChange} placeholder="Threat" />
              <input name="condition" value={formData.condition} onChange={handleFormChange} placeholder="Condition" />
              <input name="temp" value={`${formData.temp} (AQI: ${formData.aqi})`} readOnly placeholder="Temp/AQI" />
              <div>
                <textarea name="advice" value={formData.advice} onChange={handleFormChange} rows="3" />
              </div>
            </div>
          </div>

          <button type="submit">
            {dispatchMode === 'email' ? 'Send Emergency Emails' : 'Trigger Global Broadcast'}
          </button>
        </form>
      </div>
    </div>
  );
};


// --- STYLES PRESERVED --- [cite: 118-142]
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