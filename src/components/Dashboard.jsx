// components/Dashboard.jsx
import React from 'react';

const Dashboard = () => {
  return (
    <div className="cards-wrapper">
      <div className="glass-card">
        <div className="card-header-top">
          <h2>Prayagraj</h2>
          <span>19/3/26</span>
        </div>
        <div className="card-body-bottom">
          <p className="big-temp">28°</p>
          <span className="material-symbols-outlined sun-icon">sunny</span>
        </div>
      </div>

      <div className="glass-card">
        <div className="info-header">
          <span className="material-symbols-outlined large-icon">air</span>
          <span className="info-label">wind</span>
        </div>
        <p className="info-val">9 km/h</p>
      </div>

      <div className="glass-card">
        <div className="info-header">
          {/* Replaced 'shield' with 'masks' to match the image */}
          <span className="material-symbols-outlined large-icon">masks</span>
          <span className="info-label">AQI</span>
        </div>
        <p className="info-val">176</p>
      </div>

      <div className="glass-card">
        <div className="info-header">
          <span className="material-symbols-outlined large-icon">water_drop</span>
          <span className="info-label">Humidity</span>
        </div>
        <p className="info-val">32%</p>
      </div>
    </div>
  );
};

export default Dashboard;