import React, { useState, useEffect, useCallback } from 'react';
import emailjs from '@emailjs/browser';
import { GoogleGenerativeAI } from "@google/generative-ai";

const AlertPanel = ({ searchQuery }) => {
  const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
  const REPO_OWNER = import.meta.env.VITE_GITHUB_REPO_OWNER;
  const REPO_NAME = import.meta.env.VITE_GITHUB_REPO_NAME;
  const WEATHER_KEY = import.meta.env.VITE_WEATHER_API_KEY;
  const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const [contactsList, setContactsList] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileSha, setFileSha] = useState(null);
  const [dispatchMode, setDispatchMode] = useState('email');

  // SECURITY: Check if running on your computer (local) or Internet (production)
  const isLocalDev = import.meta.env.MODE === 'development';

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

  // --- NEW: Select All Logic ---
  const toggleSelectAll = () => {
    if (selectedEmails.length === contactsList.length && contactsList.length > 0) {
      setSelectedEmails([]); // Deselect all
    } else {
      setSelectedEmails([...contactsList]); // Select all
    }
  };

  // --- GitHub Database Functions ---
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
        body: JSON.stringify({ message: "Updated contacts", content: updatedContent, sha: fileSha })
      });
      if (res.ok) {
        const data = await res.json();
        setFileSha(data.content.sha); 
        alert("✅ Contacts successfully saved to GitHub!");
      }
    } catch (err) { alert("❌ Failed to save."); } finally { setLoading(false); }
  };

  const generateAIAlert = async (futureWeather) => {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      const prompt = `
        You are a Predictive Safety Officer at UIT Naini. 
        Forecast for ${futureWeather.city} at ${futureWeather.time}: ${futureWeather.temp}°C, ${futureWeather.condition}.
        Task: Create a 3-word threat title and a 3-sentence advice including practical safety tips (car for lightning, AC for heat) and a Java metaphor.
        Format response as JSON: {"threat": "...", "advice": "..."}
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const cleanText = response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      return { threat: "Manual Override", advice: "Check campus protocols." };
    }
  };

  const fetchEnvironmentalData = useCallback(async (targetCity, fullQuery) => {
    if (!targetCity || !WEATHER_KEY || !GEMINI_KEY) return;
    setLoading(true);
    try {
      let wRes;
      if (fullQuery?.lat) {
        wRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${fullQuery.lat}&lon=${fullQuery.lon}&units=metric&appid=${WEATHER_KEY}`);
      } else {
        wRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${targetCity}&units=metric&appid=${WEATHER_KEY}`);
      }
      const wData = await wRes.json();
      const next = wData.list[0];
      const forecastTime = new Date(next.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const aiRes = await generateAIAlert({ city: targetCity, temp: Math.round(next.main.temp), condition: next.weather[0].main, time: forecastTime });
      setFormData({ city: targetCity, time: forecastTime, temp: `${Math.round(next.main.temp)}°C`, condition: next.weather[0].main, threat: aiRes.threat, advice: aiRes.advice });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [WEATHER_KEY, GEMINI_KEY]);

  useEffect(() => {
    fetchContacts();
    fetchEnvironmentalData(currentCity, searchQuery);
  }, [currentCity, searchQuery, fetchContacts, fetchEnvironmentalData]);

  const triggerWebPush = () => {
    if (Notification.permission === "granted") {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(`🚨 AREA ALERT: ${formData.threat}`, {
          body: `Arriving @ ${formData.time}: ${formData.advice}`,
          icon: "/favicon.svg",
          requireInteraction: true,
          tag: "emergency",
          actions: [{ action: 'ack', title: 'Acknowledge' }]
        });
      });
      alert("📡 Broadcast Deployed.");
    }
  };

  const handleDispatch = (e) => {
    e.preventDefault();
    if (dispatchMode === 'broadcast') {
      triggerWebPush();
    } else {
      if (selectedEmails.length === 0) return alert("⚠️ Select a recipient.");
      emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        { to_emails: selectedEmails.join(","), threat: formData.threat, advice: formData.advice, city: formData.city, temp: formData.temp },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      ).then(() => alert("✅ Email Sent!"));
    }
  };

  return (
    <div className="alert-view-container hide-scroll" style={viewportStyle}>
      <div className="glass-card" style={cardStyle}>
        {loading && <div style={loaderOverlayStyle}>Syncing Predictive Data...</div>}

        <div style={headerContainerStyle}>
          <h2 style={headerStyle}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>emergency_home</span>
            Emergency Dispatch System
          </h2>
        </div>

        <form onSubmit={handleDispatch} style={formStyle}>
          <div style={innerSectionStyle}>
            <div style={sectionTopRowStyle}>
              <h4 style={labelStyle}>1. Recipients</h4>
              <div style={toggleContainerStyle}>
                <button type="button" onClick={() => setDispatchMode('email')} style={dispatchMode === 'email' ? activeToggleStyle : inactiveToggleStyle}>Email Mode</button>
                {/* BROADCAST ONLY VISIBLE ON YOUR COMPUTER */}
                {isLocalDev && (
                  <button type="button" onClick={() => setDispatchMode('broadcast')} style={dispatchMode === 'broadcast' ? activeToggleStyle : inactiveToggleStyle}>Admin Broadcast</button>
                )}
              </div>
            </div>
            
            {dispatchMode === 'email' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  {/* NEW SELECT ALL BUTTON */}
                  <button type="button" onClick={toggleSelectAll} style={syncBtnStyle}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      {selectedEmails.length === contactsList.length ? 'deselect' : 'select_all'}
                    </span>
                    {selectedEmails.length === contactsList.length ? ' Deselect' : ' Select All'}
                  </button>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button type="button" onClick={fetchContacts} style={syncBtnStyle}>Pull</button>
                    <button type="button" onClick={saveContactsToGitHub} style={saveBtnStyle}>Push</button>
                  </div>
                </div>
                <div className="hide-scroll" style={scrollContainer}>
                  {contactsList.map(email => (
                    <label key={email} style={contactItemStyle}>
                      <input 
                        type="checkbox" 
                        checked={selectedEmails.includes(email)}
                        onChange={(e) => setSelectedEmails(e.target.checked ? [...selectedEmails, email] : selectedEmails.filter(i => i !== email))} 
                      />
                      {email}
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <div style={broadcastNoticeStyle}>Area-Wide Broadcast Enabled (Admin Only)</div>
            )}
          </div>

          <div style={innerSectionStyle}>
            <h4 style={labelStyle}>2. Predictive Data</h4>
            <div style={variableGrid}>
              <input name="city" value={formData.city} onChange={handleFormChange} style={editableInputStyle} />
              <input name="threat" value={formData.threat} onChange={handleFormChange} style={editableInputStyle} />
              <input name="temp" value={formData.temp} onChange={handleFormChange} style={editableInputStyle} />
              <input name="condition" value={formData.condition} onChange={handleFormChange} style={editableInputStyle} />
              <textarea name="advice" value={formData.advice} onChange={handleFormChange} style={editableTextareaStyle} />
            </div>
          </div>

          <button type="submit" style={dispatchBtnStyle}>
            {dispatchMode === 'email' ? `Email Alert (${selectedEmails.length})` : 'Broadcast Area Alert'}
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
  padding: '20px 0'
};

const cardStyle = {
  width: '90%',
  maxWidth: '600px',
  padding: '25px',
  borderRadius: '20px',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(15px)',
  border: '1px solid rgba(255,255,255,0.1)'
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
  borderRadius: '12px'
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
  opacity: 0.8
};

const toggleContainerStyle = {
  display: 'flex',
  background: 'rgba(0,0,0,0.4)',
  padding: '4px',
  borderRadius: '8px'
};

const activeToggleStyle = {
  background: '#ff4d4d',
  color: 'white',
  border: 'none',
  padding: '6px 12px',
  borderRadius: '5px',
  fontSize: '12px',
  cursor: 'pointer'
};

const inactiveToggleStyle = {
  background: 'transparent',
  color: 'rgba(255,255,255,0.6)',
  border: 'none',
  padding: '6px 12px',
  borderRadius: '5px',
  fontSize: '12px',
  cursor: 'pointer'
};

const scrollContainer = {
  maxHeight: '120px',
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

const editableInputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.2)',
  padding: '10px',
  borderRadius: '8px',
  color: 'white',
  fontSize: '13px'
};

const editableTextareaStyle = {
  gridColumn: '1 / -1',
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.2)',
  padding: '10px',
  borderRadius: '8px',
  color: 'white',
  fontSize: '13px',
  minHeight: '60px'
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
  fontSize: '16px'
};

const contactItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '13px',
  padding: '4px'
};

const loaderOverlayStyle = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.8)',
  zIndex: 10,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: '20px',
  color: '#A3E4D7'
};

const broadcastNoticeStyle = {
  textAlign: 'center',
  padding: '20px',
  background: 'rgba(255,77,77,0.05)',
  borderRadius: '8px',
  border: '1px dashed #ff4d4d'
};
export default AlertPanel;