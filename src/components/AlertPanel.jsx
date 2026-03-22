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
    temp: "--",
    condition: "Waiting...",
    advice: "Click 'Update' to fetch the latest environmental data."
  });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
        body: JSON.stringify({
          message: "Updated contacts via Dashboard",
          content: updatedContent,
          sha: fileSha 
        })
      });

      if (res.ok) {
        const data = await res.json();
        setFileSha(data.content.sha); 
        alert("✅ Contacts successfully saved to GitHub!");
      } else {
        throw new Error("Failed to push to GitHub");
      }
    } catch (err) {
      console.error("Save Error:", err);
      alert("❌ Failed to save. Check your GitHub Token permissions.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEnvironmentalData = useCallback(async (targetCity, fullQuery) => {
    if (!targetCity || !WEATHER_KEY) return;
    setLoading(true);
    
    try {
      let wRes;
      if (fullQuery && fullQuery.lat && fullQuery.lon) {
        wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${fullQuery.lat}&lon=${fullQuery.lon}&units=metric&appid=${WEATHER_KEY}`);
      } else {
        let cityToSearch = targetCity.split(',')[0].trim();
        if (cityToSearch.toLowerCase() === 'prayagraj') cityToSearch = 'Allahabad'; 
        
        const cityEncoded = encodeURIComponent(cityToSearch);
        wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityEncoded}&units=metric&appid=${WEATHER_KEY}`);
      }
      
      const wData = await wRes.json();
      if (wData.cod !== 200) throw new Error("Sync Failed");

      const { lat, lon } = wData.coord;
      const aRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}`);
      const aData = await aRes.json();

      const temp = Math.round(wData.main.temp);
      const cond = wData.weather[0].main;
      const aqi = aData.list[0].main.aqi; 

      let threat = "Atmospheric Stability";
      let advice = "No immediate environmental hazards detected. Conditions are safe.";

      if (aqi >= 150) {
        threat = "Hazardous Air Quality";
        advice = `AQI Level ${aqi}: Dangerous pollution detected. Please wear an N95 mask and stay indoors.`;
      } else if (temp > 40) {
        threat = "Extreme Heatwave";
        advice = "High thermal stress. Stay hydrated and avoid outdoor activity between 12 PM - 4 PM.";
      } else if (cond.includes("Rain") || cond.includes("Thunder")) {
        threat = "Severe Weather Alert";
        advice = "Precipitation detected. Carry protective gear and avoid waterlogged routes.";
      }

      setFormData({
        city: targetCity,
        temp: `${temp}°C`,
        condition: cond,
        threat: threat,
        advice: advice
      });
    } catch (err) {
      setFormData(prev => ({ 
        ...prev, 
        city: targetCity, 
        threat: "Sync Interrupted", 
        condition: "Failed", 
        advice: "Connection failed. Please click the 'Update' button to try again." 
      }));
    } finally { setLoading(false); }
  }, [WEATHER_KEY]);

  useEffect(() => {
    fetchContacts();
    fetchEnvironmentalData(currentCity, searchQuery);
  }, [currentCity, searchQuery, fetchContacts, fetchEnvironmentalData]);

  const sendSafetyAlert = (e) => {
    e.preventDefault();
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
    ).then(() => alert(`✅ Alert for ${formData.city} sent successfully!`))
     .catch(() => alert("❌ Dispatch failed. Check console."));
  };

  return (
    <div className="alert-view-container hide-scroll" style={viewportStyle}>
      <div className="glass-card" style={cardStyle}>
        
        {loading && (
          <div style={loaderOverlayStyle}>
             <span className="material-symbols-outlined" style={{ fontSize: '48px', animation: 'spin 2s linear infinite' }}>sync</span>
             <p style={{marginTop: '10px'}}>Synchronizing Data...</p>
          </div>
        )}

        <div style={headerContainerStyle}>
          <h2 style={headerStyle}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>emergency_home</span>
            Emergency Dispatch System
          </h2>
        </div>

        <form onSubmit={sendSafetyAlert} style={formStyle}>
          
          <div style={innerSectionStyle}>
            <div style={sectionTopRowStyle}>
              <h4 style={labelStyle}>
                <span className="material-symbols-outlined">group</span> 1. Recipients
              </h4>
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
                  <input type="checkbox" onChange={(e) => setSelectedEmails(prev => e.target.checked ? [...prev, email] : prev.filter(i => i !== email))} />
                  {email}
                </label>
              ))}
            </div>

            <div style={inputContainerStyle}>
              <input type="email" placeholder="New email..." value={newEmail} onChange={e => setNewEmail(e.target.value)} style={inputStyle} />
              <button type="button" onClick={() => { if(newEmail) { setContactsList([...contactsList, newEmail]); setNewEmail(""); } }} style={addBtnStyle}>Add</button>
            </div>
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
                <input name="temp" value={formData.temp} onChange={handleFormChange} style={editableInputStyle} />
              </div>
              <div style={inputGroupStyle}>
                <span className="material-symbols-outlined" style={iconInsideStyle}>cloud</span>
                <input name="condition" value={formData.condition} onChange={handleFormChange} style={editableInputStyle} />
              </div>
              <div style={textareaGroupStyle}>
                <span className="material-symbols-outlined" style={iconInsideTextareaStyle}>health_and_safety</span>
                <textarea name="advice" value={formData.advice} onChange={handleFormChange} style={editableTextareaStyle} rows="2" />
              </div>
            </div>
          </div>

          <button type="submit" style={dispatchBtnStyle}>
            Dispatch Alert Now
          </button>
        </form>
      </div>
    </div>
  );
};

// --- MULTI-LINE STYLES (Standard Format) ---

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
  outline: 'none',
  transition: 'border-color 0.2s'
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
  fontFamily: 'inherit',
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