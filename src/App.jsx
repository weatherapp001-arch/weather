// App.js
import React, { useState } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import Cloud from './components/Cloud';
import Temperature from './components/Temperature';
import Calendar from './components/Calendar'; // Added Import

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <div className={`full-screen-container ${isDarkMode ? 'dark-theme' : ''}`}>
      <div className="main-app-window">
        <header className="glass-header">
          <div className="logo">
            <span className="material-symbols-outlined logo-icon">sunny</span> weather
          </div>
          <div className="search-bar">
            <label style={{ marginRight: '10px' }}>Search</label>
            <input type="text" className="glass-input" placeholder="Search for location" />
          </div>
        </header>
        
        <div className="app-body">
          <nav className="glass-sidebar">
            <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <span className="material-symbols-outlined">insights</span>
            </button>
            <button className={`nav-btn ${activeTab === 'cloud' ? 'active' : ''}`} onClick={() => setActiveTab('cloud')}>
              <span className="material-symbols-outlined">cloud</span>
            </button>
            <button className={`nav-btn ${activeTab === 'temperature' ? 'active' : ''}`} onClick={() => setActiveTab('temperature')}>
              <span className="material-symbols-outlined">device_thermostat</span>
            </button>
            
            {/* Updated to Calendar */}
            <button className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
              <span className="material-symbols-outlined">calendar_month</span>
            </button>
            
            <button className="nav-btn" onClick={toggleTheme} style={{ marginTop: 'auto', marginBottom: '20px' }}>
              <span className="material-symbols-outlined">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </nav>

          <main className="view-port">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'cloud' && <Cloud />}
            {activeTab === 'temperature' && <Temperature />}
            {activeTab === 'calendar' && <Calendar />}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;