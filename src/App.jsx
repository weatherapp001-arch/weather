import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import Cloud from './components/Cloud';
import Temperature from './components/Temperature';
import Calendar from './components/Calendar';
import AlertPanel from './components/AlertPanel'; 

// We need the API key here to fetch the city suggestions
const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

function App() {
  const [activeTab, setActiveTab] = useState('cloud'); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  
  // NEW STATES: For the Autocomplete Dropdown
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Debounced API call to get city suggestions as you type
  useEffect(() => {
    if (inputValue.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const fetchTimer = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${inputValue}&limit=5&appid=${API_KEY}`);
        const data = await res.json();
        setSuggestions(data);
        setShowDropdown(true);
      } catch (error) {
        console.error("Error fetching city suggestions:", error);
      }
    }, 500);

    return () => clearTimeout(fetchTimer); 
  }, [inputValue]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() !== '') {
      setSearchQuery({ city: inputValue, name: inputValue }); 
      setInputValue(''); 
      setShowDropdown(false);
    }
  };

  const handleCitySelect = (city) => {
    setSearchQuery({ 
      lat: city.lat, 
      lon: city.lon,
      name: `${city.name}, ${city.country}` 
    }); 
    setInputValue('');
    setShowDropdown(false);
  };

  return (
    <div className={`full-screen-container ${isDarkMode ? 'dark-theme' : ''}`}>
      <div className="main-app-window">
        <header className="glass-header" style={{ position: 'relative', zIndex: 100 }}>
          <div className="logo">
            <span className="material-symbols-outlined logo-icon">sunny</span> weather
          </div>
          
          <div className="search-bar" style={{ position: 'relative' }}>
            <label style={{ marginRight: '10px' }}>Search</label>
            <form onSubmit={handleSearchSubmit} style={{ display: 'inline' }}>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Search for location" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </form>

            {showDropdown && suggestions.length > 0 && (
              <ul style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                width: '100%',
                background: 'rgba(20, 30, 50, 0.9)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                listStyle: 'none',
                padding: '5px 0',
                margin: '5px 0 0 0',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                zIndex: 1000,
                textAlign: 'left'
              }}>
                {suggestions.map((city, index) => (
                  <li 
                    key={index}
                    onClick={() => handleCitySelect(city)}
                    style={{
                      padding: '10px 20px',
                      cursor: 'pointer',
                      color: 'white',
                      borderBottom: index !== suggestions.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <strong>{city.name}</strong> 
                    <span style={{ fontSize: '12px', opacity: 0.7, marginLeft: '8px' }}>
                      {city.state ? `${city.state}, ` : ''}{city.country}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>
        
        <div className="app-body">
          <nav className="glass-sidebar">
            <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><span className="material-symbols-outlined">insights</span></button>
            <button className={`nav-btn ${activeTab === 'cloud' ? 'active' : ''}`} onClick={() => setActiveTab('cloud')}><span className="material-symbols-outlined">cloud</span></button>
            <button className={`nav-btn ${activeTab === 'temperature' ? 'active' : ''}`} onClick={() => setActiveTab('temperature')}><span className="material-symbols-outlined">device_thermostat</span></button>
            <button className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}><span className="material-symbols-outlined">calendar_month</span></button>
            
            {/* <-- 2. NEW ALERT BUTTON ADDED HERE --> */}
            <button className={`nav-btn ${activeTab === 'alert' ? 'active' : ''}`} onClick={() => setActiveTab('alert')}>
              <span className="material-symbols-outlined">notification_important</span>
            </button>

            <button className="nav-btn" onClick={toggleTheme} style={{ marginTop: 'auto', marginBottom: '20px' }}><span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span></button>
          </nav>

          <main className="view-port">
            {activeTab === 'dashboard' && <Dashboard searchQuery={searchQuery} />}
            {activeTab === 'cloud' && <Cloud searchQuery={searchQuery} />}
            {activeTab === 'temperature' && <Temperature searchQuery={searchQuery} />}
            {activeTab === 'calendar' && <Calendar searchQuery={searchQuery} />}
            
            {/* <-- 3. ALERT PANEL VIEW RENDERED HERE --> */}
            {activeTab === 'alert' && <AlertPanel searchQuery={searchQuery} />}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;