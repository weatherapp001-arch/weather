import React, { useState, useEffect, useCallback } from 'react';
import emailjs from '@emailjs/browser';

const AlertPanel = ({ searchQuery }) => {
  const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
  const REPO_OWNER = import.meta.env.VITE_GITHUB_REPO_OWNER;
  const REPO_NAME = import.meta.env.VITE_GITHUB_REPO_NAME;
  const WEATHER_KEY = import.meta.env.VITE_WEATHER_API_KEY;

  const [contactsList, setContactsList] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileSha, setFileSha] = useState(null);
  const [dispatchMode, setDispatchMode] = useState('email'); 

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

  const fetchContacts = useCallback(async () => {
    if (!GITHUB_TOKEN || GITHUB_TOKEN.includes("actual_token")) return;
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/contacts.json`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
      });
      const data = await res.json();
      if (data.content) {
        setContactsList(JSON.parse(atob(data.content)));
        setFileSha(data.sha); 
      }
    } catch (err) { console.error("Database Error:", err); }
  }, [GITHUB_TOKEN, REPO_OWNER, REPO_NAME]);

  const saveContactsToGitHub = async () => {
    if (!GITHUB_TOKEN) return alert("Missing GitHub Token");
    setLoading(true);
    try {
      const updatedContent = btoa(JSON.stringify(contactsList, null, 2));
      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/contacts.json`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: "Updated contacts via Dashboard", content: updatedContent, sha: fileSha })
      });

      if (res.ok) {
        const data = await res.json();
        setFileSha(data.content.sha); 
        alert("✅ Contacts successfully saved to GitHub!");
      } else throw new Error("Failed to push to GitHub");
    } catch (err) {
      alert("❌ Failed to save. Check your GitHub Token permissions.");
    } finally { setLoading(false); }
  };

  // --- HELPER 1: CONVERT PM2.5 TO US AQI ---
  const calculateUS_AQI = (pm25) => {
    if (!pm25) return 20; 
    if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
    if (pm25 <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51);
    if (pm25 <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101);
    if (pm25 <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151);
    if (pm25 <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5) + 201);
    return 300; 
  };

  // --- HELPER 2: EXACT TARGET CITY TIME ZONE CALCULATOR ---
  const formatCityTime = (dtUTC, timezoneOffsetSeconds) => {
    // We add the city's exact shift from UTC, then read it using getUTCHours
    // This totally bypasses your browser's IST timezone.
    const localDate = new Date((dtUTC + timezoneOffsetSeconds) * 1000);
    let hours = localDate.getUTCHours();
    let minutes = localDate.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const mins = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${mins} ${ampm}`;
  };

  // --- MULTI-HAZARD GLOBAL RULES ENGINE ---
  const generateAdvancedAlert = (metrics) => {
    const alerts = [];
    let maxThreatLevel = 0; 
    let primaryThreat = "Safe (Next 2 Hrs)";

    // 1. Air Quality (AQI > 150 Rule)
    if (metrics.aqi > 150) {
      alerts.push(`TOXIC AIR: AQI is projected to be ${metrics.aqi}. You must wear an N95 mask outside.`);
      if (maxThreatLevel <= 2) { maxThreatLevel = 2; primaryThreat = "Hazard: Toxic AQI"; }
    }

    // 2. Cyclone / Hurricane Rule (Wind Speed > 25 m/s is ~90 km/h)
    if (metrics.windSpeed > 25) {
      alerts.push(`CYCLONE WARNING: Destructive winds at ${Math.round(metrics.windSpeed * 3.6)} km/h. Secure objects and stay indoors!`);
      maxThreatLevel = 3; primaryThreat = "EMERGENCY: Cyclone Risk"; 
    }

    // 3. Flash Flood Rule (Rain volume > 30mm is extreme)
    if (metrics.rainVolume > 30) {
      alerts.push(`FLOOD WARNING: Extreme rainfall (${metrics.rainVolume}mm). Evacuate low-lying areas.`);
      maxThreatLevel = 3; primaryThreat = "EMERGENCY: Flash Flood";
    }

    // 4. Probability of Precipitation Rule (> 70%)
    if (metrics.pop >= 0.70 && metrics.rainVolume <= 30) {
      alerts.push(`HEAVY RAIN: ${Math.round(metrics.pop * 100)}% chance of rain. Carry umbrellas.`);
      if (maxThreatLevel < 1) { maxThreatLevel = 1; primaryThreat = "Watch: High Rain Prob."; }
    }

    // 5. Heatwave Rule
    if (metrics.temp >= 40 || (metrics.temp >= 35 && metrics.humidity >= 60)) {
      alerts.push(`HEATWAVE: Dangerous heat index. Remain in AC to prevent thermal throttling.`);
      if (maxThreatLevel <= 2) { maxThreatLevel = 2; primaryThreat = "Hazard: Heatwave"; }
    }

    // 6. Snowfall Rule
    if (metrics.condition.includes('snow') || metrics.snowVolume > 0) {
      alerts.push(`SNOW ALERT: Blizzard conditions possible. Wrap your travel plans in a strict try-catch block.`);
      if (maxThreatLevel <= 2) { maxThreatLevel = 2; primaryThreat = "Hazard: Snow/Ice"; }
    }

    // 7. Thunderstorm Rule
    if (metrics.condition.includes('thunderstorm')) {
      alerts.push(`LIGHTNING: Active thunderstorms approaching. Stay off open grounds.`);
      if (maxThreatLevel <= 2) { maxThreatLevel = 2; primaryThreat = "Hazard: Thunderstorm"; }
    }

    // Default Safe State
    if (alerts.length === 0) {
      return {
        threat: primaryThreat,
        advice: `Target Local Time: ${metrics.time}. Safe for the next 2-3 hours. Code compilation is clear!`
      };
    }

    return {
      threat: primaryThreat,
      advice: `Predicted for ${metrics.time} (Local City Time): ` + alerts.join(" ")
    };
  };

  const fetchEnvironmentalData = useCallback(async (targetCity, fullQuery) => {
    if (!targetCity || !WEATHER_KEY) return;
    setLoading(true);
    
    try {
      // 1. FETCH WEATHER FORECAST
      let wRes, wUrl;
      if (fullQuery && fullQuery.lat && fullQuery.lon) {
        wUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${fullQuery.lat}&lon=${fullQuery.lon}&units=metric&appid=${WEATHER_KEY}`;
      } else {
        let cityToSearch = targetCity.split(',')[0].trim();
        if (cityToSearch.toLowerCase() === 'prayagraj') cityToSearch = 'Allahabad'; 
        const cityEncoded = encodeURIComponent(cityToSearch);
        wUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${cityEncoded}&units=metric&appid=${WEATHER_KEY}`;
      }
      
      wRes = await fetch(wUrl);
      const wData = await wRes.json();
      if (wData.cod !== "200") throw new Error("Weather Sync Failed");

      const lat = wData.city.coord.lat;
      const lon = wData.city.coord.lon;

      // 2. FETCH AIR QUALITY FORECAST
      const aqiRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}`);
      const aqiData = await aqiRes.json();

      // 3. THE 2-HOUR TARGET ALGORITHM
      const currentUtcSeconds = Math.floor(Date.now() / 1000);
      const targetUtcSeconds = currentUtcSeconds + (2 * 60 * 60); // Exact moment 2 hours from now

      // Find the forecast block closest to the 2-hour target
      let futureWeather = wData.list[0];
      let minDiff = Infinity;
      for (const item of wData.list) {
        const diff = Math.abs(item.dt - targetUtcSeconds);
        if (diff < minDiff) {
          minDiff = diff;
          futureWeather = item;
        }
      }

      // Find the AQI block closest to the 2-hour target
      let futureAQI = aqiData.list[0];
      let minAqiDiff = Infinity;
      for (const item of aqiData.list) {
        const diff = Math.abs(item.dt - targetUtcSeconds);
        if (diff < minAqiDiff) {
          minAqiDiff = diff;
          futureAQI = item;
        }
      }

      // 4. EXTRACT DATA & FORMAT EXACT LOCAL TIME
      const temp = Math.round(futureWeather.main.temp);
      const humidity = futureWeather.main.humidity;
      const cond = futureWeather.weather[0].main.toLowerCase();
      const pop = futureWeather.pop || 0; 
      const windSpeed = futureWeather.wind.speed || 0; 
      const rainVolume = futureWeather.rain ? (futureWeather.rain['3h'] || 0) : 0;
      const snowVolume = futureWeather.snow ? (futureWeather.snow['3h'] || 0) : 0;
      
      const pm25 = futureAQI.components.pm2_5;
      const actualAQI = calculateUS_AQI(pm25);

      // Uses our new custom Time Zone function!
      const forecastTime = formatCityTime(futureWeather.dt, wData.city.timezone);

      const futureMetrics = { 
        city: targetCity, 
        time: forecastTime,
        temp: temp, 
        humidity: humidity,
        condition: cond, 
        pop: pop,
        windSpeed: windSpeed,
        rainVolume: rainVolume,
        snowVolume: snowVolume,
        aqi: actualAQI
      };
      
      const generatedAlert = generateAdvancedAlert(futureMetrics);

      setFormData({ 
        city: targetCity, 
        time: forecastTime, 
        temp: `${temp}°C (AQI: ${actualAQI})`, 
        condition: cond.charAt(0).toUpperCase() + cond.slice(1), 
        threat: generatedAlert.threat, 
        advice: generatedAlert.advice 
      });
    } catch (err) {
      console.error(err);
      setFormData(prev => ({ ...prev, city: targetCity, threat: "Sync Interrupted", condition: "Failed", advice: "Connection failed to global satellites." }));
    } finally { setLoading(false); }
  }, [WEATHER_KEY]);

  useEffect(() => {
    fetchContacts();
    fetchEnvironmentalData(currentCity, searchQuery);
  }, [currentCity, searchQuery, fetchContacts, fetchEnvironmentalData]);

  const triggerWebPush = async () => {
    // 1. Check and request permission
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return alert("⚠️ Permission denied. You must allow notifications in your browser settings.");
      }
    }

    // 2. The Immortal Spawn Function
    const spawnNotification = () => {
      // Create a unique ID for every click so you can send multiple alerts
      const uniqueTag = "emergency-broadcast-" + Date.now();

      const systemAlert = new Notification(`🚨 AREA ALERT: ${formData.threat}`, {
        body: `Predicted for ${formData.time}: ${formData.advice}\n\n⚠️ YOU MUST CLICK THIS BOX TO DISMISS.`,
        icon: "/favicon.svg",
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true, 
        tag: uniqueTag 
      });

      let properlyAcknowledged = false;

      // 3. What happens when they click the notification body
      systemAlert.onclick = (event) => {
        event.preventDefault();
        window.focus(); // Brings the dashboard back
        properlyAcknowledged = true; // Mark as safely acknowledged
        systemAlert.close(); // Close it permanently
      };

      // 4. The "Respawn Hack" - What happens if they click the 'X'
      systemAlert.onclose = () => {
        if (!properlyAcknowledged) {
          // If they tried to close it without clicking the body, spawn it again!
          setTimeout(spawnNotification, 500); 
        }
      };
    };

    try {
      spawnNotification();
      alert("📡 Aggressive Sticky Broadcast deployed! It will not die until clicked.");
    } catch (error) {
      console.error("Broadcast Error:", error);
      alert("❌ Your browser blocked the local notification API.");
    }
  };

  const handleDispatch = (e) => {
    e.preventDefault();
    
    if (dispatchMode === 'broadcast') {
      triggerWebPush();
    } else {
      if (selectedEmails.length === 0) return alert("⚠️ Select a recipient first.");
      const cleanParams = {
        to_emails: selectedEmails.join(","),
        name: "Aryan Sahu",
        city: formData.city.replace(/\+/g, ' '),
        threat: formData.threat.replace(/\+/g, ' '),
        temp: formData.temp,
        condition: formData.condition.replace(/\+/g, ' '),
        advice: formData.advice.replace(/\+/g, ' ')
      };

      emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        cleanParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      ).then(() => alert(`✅ Email Alert for ${formData.city} sent successfully!`))
       .catch(() => alert("❌ Email Dispatch failed. Check console."));
    }
  };

  return (
    <div className="alert-view-container hide-scroll" style={viewportStyle}>
      <div className="glass-card" style={cardStyle}>
        
        {loading && (
          <div style={loaderOverlayStyle}>
             <span className="material-symbols-outlined" style={{ fontSize: '48px', animation: 'spin 2s linear infinite' }}>sync</span>
             <p style={{marginTop: '10px'}}>Scanning Global Hazard Matrices...</p>
          </div>
        )}

        <div style={headerContainerStyle}>
          <h2 style={headerStyle}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>emergency_home</span>
            Emergency Dispatch System
          </h2>
          <p style={{ fontSize: '12px', opacity: 0.7, margin: '5px 0 0 0' }}>
            Data Source: OpenWeather Global | Predictive Engine: Multi-Hazard Matrix
          </p>
        </div>

        <form onSubmit={handleDispatch} style={formStyle}>
          
          <div style={innerSectionStyle}>
            <div style={sectionTopRowStyle}>
              <h4 style={labelStyle}>
                <span className="material-symbols-outlined">network_manage</span> 1. Dispatch Mode
              </h4>
              
              <div style={toggleContainerStyle}>
                <button type="button" onClick={() => setDispatchMode('email')} style={dispatchMode === 'email' ? activeToggleStyle : inactiveToggleStyle}>
                  Private Emails
                </button>
                <button type="button" onClick={() => setDispatchMode('broadcast')} style={dispatchMode === 'broadcast' ? activeToggleStyle : inactiveToggleStyle}>
                  Broadcast All
                </button>
              </div>
            </div>
            
            {dispatchMode === 'email' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px' }}>
                  <button type="button" onClick={fetchContacts} style={syncBtnStyle} title="Reload Contacts">
                     <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cloud_download</span> Pull
                  </button>
                  <button type="button" onClick={saveContactsToGitHub} style={saveBtnStyle} title="Save to GitHub">
                     <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cloud_upload</span> Push
                  </button>
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
                <p style={{ margin: '10px 0 0 0', fontWeight: 'bold', color: '#ff4d4d' }}>Area-Wide Push Notification Active</p>
                <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px', lineHeight: '1.4' }}>
                  This will trigger a system-level alert to all devices currently connected to the local network or web-app, bypassing the need for phone numbers.
                </p>
              </div>
            )}
          </div>

          <div style={innerSectionStyle}>
            <div style={sectionTopRowStyle}>
              <h4 style={labelStyle}>
                <span className="material-symbols-outlined">analytics</span> 2. Automated Variables
              </h4>
              <button type="button" onClick={() => fetchEnvironmentalData(currentCity, searchQuery)} style={syncBtnStyle} title="Force Refresh Data">
                <span className="material-symbols-outlined" style={{ fontSize: '13px', animation: loading ? 'spin 1s linear infinite' : 'none' }}>refresh</span> Update
              </button>
            </div>

            <div style={variableGrid}>
              <div style={inputGroupStyle}>
                <span className="material-symbols-outlined" style={iconInsideStyle}>location_on</span>
                <input name="city" value={formData.city} onChange={handleFormChange} style={editableInputStyle} />
              </div>
              <div style={inputGroupStyle}>
                <span className="material-symbols-outlined" style={iconInsideStyle}>warning</span>
                <input name="threat" value={formData.threat} onChange={handleFormChange} style={editableInputStyle} />
              </div>
              <div style={inputGroupStyle}>
                <span className="material-symbols-outlined" style={iconInsideStyle}>thermostat</span>
                <input name="temp" value={formData.temp} onChange={handleFormChange} style={editableInputStyle} title="Temp & AQI" />
              </div>
              <div style={inputGroupStyle}>
                <span className="material-symbols-outlined" style={iconInsideStyle}>cloud</span>
                <input name="condition" value={formData.condition} onChange={handleFormChange} style={editableInputStyle} />
              </div>
              <div style={textareaGroupStyle}>
                <span className="material-symbols-outlined" style={iconInsideTextareaStyle}>health_and_safety</span>
                <textarea name="advice" value={formData.advice} onChange={handleFormChange} style={editableTextareaStyle} rows="4" />
              </div>
            </div>
          </div>

          <button type="submit" style={dispatchBtnStyle}>
            {dispatchMode === 'email' ? 'Dispatch Private Emails Now' : 'Broadcast to Local Area Now'}
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