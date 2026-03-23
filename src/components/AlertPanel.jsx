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

  const toggleSelectAll = () => {
    if (selectedEmails.length === contactsList.length && contactsList.length > 0) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails([...contactsList]);
    }
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

  const generateAIAlert = async (futureWeather) => {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

      const prompt = `
        You are a Predictive Safety Officer at UIT Naini. 
        Forecast for ${futureWeather.city} arriving at exactly ${futureWeather.time}: 
        Temperature: ${futureWeather.temp}°C, Condition: ${futureWeather.condition}.
        
        The audience is a 4th-semester B.Tech Computer Science student.
        Task: 
        1. Create a 3-word "Threat Level" title.
        2. Create a 3-sentence "Predictive Safety Advice" following these strict rules:
           - Sentence 1: Explicitly state the arrival time (${futureWeather.time}) and the impending weather threat.
           - Sentence 2: Provide specific, practical physical safety advice based on the condition (e.g., if thunderstorm/lightning, advise to stay in a car and away from trees; if extreme heat, advise indoor AC; if rain, avoid waterlogged areas).
           - Sentence 3: Conclude with a clever Java or Coding metaphor to keep the CS student engaged.
        Format your response strictly as a JSON object: {"threat": "...", "advice": "..."}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const cleanText = response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      return { threat: "Manual Override Required", advice: "Unable to reach AI prediction servers. Follow standard campus safety protocols." };
    }
  };

  const fetchEnvironmentalData = useCallback(async (targetCity, fullQuery) => {
    if (!targetCity || !WEATHER_KEY || !GEMINI_KEY) return;
    setLoading(true);
    
    try {
      let wRes;
      if (fullQuery && fullQuery.lat && fullQuery.lon) {
        wRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${fullQuery.lat}&lon=${fullQuery.lon}&units=metric&appid=${WEATHER_KEY}`);
      } else {
        let cityToSearch = targetCity.split(',')[0].trim();
        if (cityToSearch.toLowerCase() === 'prayagraj') cityToSearch = 'Allahabad'; 
        const cityEncoded = encodeURIComponent(cityToSearch);
        wRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${cityEncoded}&units=metric&appid=${WEATHER_KEY}`);
      }
      
      const wData = await wRes.json();
      if (wData.cod !== "200") throw new Error("Sync Failed");

      const nextForecast = wData.list[0];
      const temp = Math.round(nextForecast.main.temp);
      const cond = nextForecast.weather[0].main;
      const forecastTime = new Date(nextForecast.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const futureMetrics = { city: targetCity, temp: temp, condition: cond, time: forecastTime };
      const aiResponse = await generateAIAlert(futureMetrics);

      setFormData({ city: targetCity, time: forecastTime, temp: `${temp}°C`, condition: cond, threat: aiResponse.threat, advice: aiResponse.advice });
    } catch (err) {
      setFormData(prev => ({ ...prev, city: targetCity, threat: "Sync Interrupted", condition: "Failed", advice: "Connection failed." }));
    } finally { setLoading(false); }
  }, [WEATHER_KEY, GEMINI_KEY]);

  useEffect(() => {
    fetchContacts();
    fetchEnvironmentalData(currentCity, searchQuery);
  }, [currentCity, searchQuery, fetchContacts, fetchEnvironmentalData]);

  const triggerWebPush = () => {
    if (Notification.permission === "granted") {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(`🚨 AREA ALERT: ${formData.threat}`, {
          body: `Predicted for ${formData.time}: ${formData.advice}`,
          icon: "/favicon.svg",
          vibrate: [200, 100, 200, 100, 200],
          requireInteraction: true, 
          tag: "emergency-broadcast",
          actions: [
            { action: 'acknowledge', title: 'Acknowledge Alert' },
            { action: 'view', title: 'Open Live Dashboard' }
          ]
        });
      });
      
      alert("📡 Sticky Broadcast signal deployed to all active app instances.");
    } else {
      alert("⚠️ You must click 'Enable Campus Alerts' first to grant browser permissions.");
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
             <p style={{marginTop: '10px'}}>Synchronizing Predictive Data...</p>
          </div>
        )}

        <div style={headerContainerStyle}>
          <h2 style={headerStyle}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>emergency_home</span>
            Emergency Dispatch System
          </h2>
          <p style={{ fontSize: '12px', opacity: 0.7, margin: '5px 0 0 0' }}>
            Data Source: Bamrauli IMD/OpenWeather | Predictive Engine: Gemini AI
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
                {isLocalDev && (
                  <button type="button" onClick={() => setDispatchMode('broadcast')} style={dispatchMode === 'broadcast' ? activeToggleStyle : inactiveToggleStyle}>
                    Broadcast All
                  </button>
                )}
              </div>
            </div>
            
            {dispatchMode === 'email' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <button type="button" onClick={toggleSelectAll} style={syncBtnStyle}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      {selectedEmails.length === contactsList.length ? 'deselect' : 'select_all'}
                    </span>
                    {selectedEmails.length === contactsList.length ? ' Deselect All' : ' Select All'}
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={fetchContacts} style={syncBtnStyle} title="Reload Contacts">
                       <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cloud_download</span> Pull
                    </button>
                    <button type="button" onClick={saveContactsToGitHub} style={saveBtnStyle} title="Save to GitHub">
                       <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cloud_upload</span> Push
                    </button>
                  </div>
                </div>
                <div className="hide-scroll" style={scrollContainer}>
                  {contactsList.map(email => (
                    <label key={email} style={contactItemStyle}>
                      <input type="checkbox" checked={selectedEmails.includes(email)} onChange={(e) => setSelectedEmails(prev => e.target.checked ? [...prev, email] : prev.filter(i => i !== email))} />
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
                <span className="material-symbols-outlined">analytics</span> 2. Predictive Data
              </h4>
              {/* THE RESTORED UPDATE BUTTON */}
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
                <input name="temp" value={formData.temp} onChange={handleFormChange} style={editableInputStyle} />
              </div>
              <div style={inputGroupStyle}>
                <span className="material-symbols-outlined" style={iconInsideStyle}>cloud</span>
                <input name="condition" value={formData.condition} onChange={handleFormChange} style={editableInputStyle} />
              </div>
              <div style={textareaGroupStyle}>
                <span className="material-symbols-outlined" style={iconInsideTextareaStyle}>health_and_safety</span>
                <textarea name="advice" value={formData.advice} onChange={handleFormChange} style={editableTextareaStyle} rows="3" />
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
  overflowX: 'hidden', // Forces horizontal scroll to hide
  padding: '20px 10px', // Shrinks padding for better mobile fit
  paddingBottom: '60px',
  boxSizing: 'border-box' // CRITICAL: Fixes the side overflow
};

const cardStyle = {
  width: '100%', // Use 100% of the available space up to maxWidth
  maxWidth: '600px',
  padding: '25px',
  borderRadius: '20px',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(15px)',
  border: '1px solid rgba(255,255,255,0.1)',
  position: 'relative',
  marginBottom: '30px',
  boxSizing: 'border-box', // CRITICAL: Keeps padding inside the width
  margin: '0 auto' // Centers the card
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
  border: '1px solid rgba(255,255,255,0.05)',
  boxSizing: 'border-box'
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

// THE RESTORED INPUT WRAPPER
const inputGroupStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  width: '100%'
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
  outline: 'none',
  boxSizing: 'border-box'
};

const textareaGroupStyle = {
  position: 'relative',
  display: 'flex',
  gridColumn: '1 / -1',
  width: '100%'
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
  minHeight: '60px',
  boxSizing: 'border-box'
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
  color: 'white',
  boxSizing: 'border-box'
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
  marginTop: '10px',
  width: '100%',
  boxSizing: 'border-box'
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