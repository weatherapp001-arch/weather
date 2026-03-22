import React, { useState, useEffect } from 'react';

// Configuration
const API_KEY = '2e24befa68c3a074d74625c8ed3099a0';
const WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const AIR_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

// Mapper for icons
const mapApiToMaterialIcon = (id, iconCode) => {
  const isNight = iconCode.includes('n');
  if (id === 800) return isNight ? 'clear_night' : 'sunny';
  if (id === 801 || id === 802) return isNight ? 'partly_cloudy_night' : 'partly_cloudy_day';
  if (id === 803 || id === 804) return 'cloud';
  if (id >= 200 && id < 300) return 'thunderstorm';
  if (id >= 300 && id < 400) return 'grain';
  if (id >= 500 && id < 600) return 'rainy';
  if (id >= 600 && id < 700) return 'weather_snow';
  return isNight ? 'clear_night' : 'sunny';
};

// Helper function to convert Wind Degrees to Compass Direction String
const getWindDirection = (deg) => {
  const compassPoints = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const val = Math.floor((deg / 22.5) + 0.5);
  return compassPoints[val % 16];
};

// NEW: Dynamic SVG Compass Component
const WindCompass = ({ degree }) => {
  return (
    <div style={{ position: 'relative', width: '80px', height: '80px' }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        {/* Outer Ring */}
        <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.15)" strokeWidth="6" fill="none" />
        
        {/* Cardinal Directions (N, E, S, W) */}
        <text x="50" y="18" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle" opacity="0.6">N</text>
        <text x="88" y="54" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle" opacity="0.6">E</text>
        <text x="50" y="90" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle" opacity="0.6">S</text>
        <text x="12" y="54" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle" opacity="0.6">W</text>

        {/* Rotating Arrow (Points in the direction the wind is blowing) */}
        <g style={{ transform: `rotate(${degree}deg)`, transformOrigin: '50px 50px', transition: 'transform 1s ease-out' }}>
          {/* Sleek modern arrow shape */}
          <polygon points="50,22 65,70 50,58 35,70" fill="#64B5F6" filter="drop-shadow(0px 4px 4px rgba(0,0,0,0.3))" />
        </g>
      </svg>
    </div>
  );
};

const Dashboard = ({ searchQuery }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async (query) => {
    try {
      let url = '';
      if (query.lat && query.lon) {
        url = `${WEATHER_URL}?lat=${query.lat}&lon=${query.lon}&units=metric&appid=${API_KEY}`;
      } else if (query.city) {
        url = `${WEATHER_URL}?q=${query.city}&units=metric&appid=${API_KEY}`;
      }

      const weatherRes = await fetch(url);
      const data = await weatherRes.json();

      if (data.cod === 200 || data.cod === "200") {
        
        // Fetch AQI using chained API call
        const airRes = await fetch(`${AIR_URL}?lat=${data.coord.lat}&lon=${data.coord.lon}&appid=${API_KEY}`);
        const airData = await airRes.json();
        const rawPm25 = airData.list[0].components.pm2_5;
        const calculatedAqi = Math.round(rawPm25 * 3.5); 

        const date = new Date();
        const dateString = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;

        // Extract city name and override hyper-local Prayagraj stations
        let cityName = query.name ? query.name.split(',')[0] : data.name;
        if (cityName === 'Jahāngīrābād' || cityName === 'George Town') {
          cityName = 'Prayagraj';
        }

        setWeatherData({
          city: cityName,
          date: dateString,
          temp: Math.round(data.main.temp),
          icon: mapApiToMaterialIcon(data.weather[0].id, data.weather[0].icon),
          wind: Math.round(data.wind.speed * 3.6), 
          windDeg: data.wind.deg, // NEW: We store the raw degree here for the compass!
          windDir: getWindDirection(data.wind.deg), 
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          aqi: calculatedAqi,
          visibility: (data.visibility / 1000).toFixed(1) 
        });
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (searchQuery) {
      if (searchQuery.lat && searchQuery.lon) {
        fetchDashboardData({ lat: searchQuery.lat, lon: searchQuery.lon, name: searchQuery.name });
      } else if (searchQuery.city) {
        fetchDashboardData({ city: searchQuery.city, name: searchQuery.name });
      }
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchDashboardData({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => fetchDashboardData({ city: 'Prayagraj', name: 'Prayagraj' })
      );
    }
  }, [searchQuery]);

  if (loading || !weatherData) {
    return <div style={{ color: 'white', padding: '40px' }}><h3>Loading Live Data...</h3></div>;
  }

  return (
    <div className="cards-wrapper">
      {/* 1. Main City & Temp Card */}
      <div className="glass-card">
        <div className="card-header-top">
          <h2>{weatherData.city}</h2>
          <span>{weatherData.date}</span>
        </div>
        <div className="card-body-bottom">
          <p className="big-temp">{weatherData.temp}°</p>
          <span className="material-symbols-outlined sun-icon" style={{ color: weatherData.icon.includes('sunny') ? '#FFB74D' : 'white' }}>
            {weatherData.icon}
          </span>
        </div>
      </div>

      {/* 2. Wind Speed & Direction Card (UPDATED) */}
      <div className="glass-card">
        <div className="info-header">
          <span className="material-symbols-outlined large-icon">air</span>
          <span className="info-label">Wind</span>
        </div>
        
        {/* Flex container to place Compass and Text side-by-side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '15px' }}>
          <WindCompass degree={weatherData.windDeg} />
          <div style={{ textAlign: 'left' }}>
            <p className="info-val" style={{ margin: '0 0 5px 0', fontSize: '28px' }}>{weatherData.wind} <span style={{fontSize: '16px', fontWeight: 'normal'}}>km/h</span></p>
            <p style={{ margin: 0, fontSize: '16px', opacity: 0.8, fontWeight: 'bold' }}>{weatherData.windDir}</p>
          </div>
        </div>
      </div>

      {/* 3. Air Quality (AQI) Card */}
      <div className="glass-card">
        <div className="info-header">
          <span className="material-symbols-outlined large-icon">masks</span>
          <span className="info-label">AQI</span>
        </div>
        <p className="info-val">{weatherData.aqi}</p>
      </div>

      {/* 4. Humidity Card */}
      <div className="glass-card">
        <div className="info-header">
          <span className="material-symbols-outlined large-icon">water_drop</span>
          <span className="info-label">Humidity</span>
        </div>
        <p className="info-val">{weatherData.humidity}%</p>
      </div>

      {/* 5. Pressure Card */}
      <div className="glass-card">
        <div className="info-header">
          <span className="material-symbols-outlined large-icon">compress</span>
          <span className="info-label">Pressure</span>
        </div>
        <p className="info-val">{weatherData.pressure} hPa</p>
      </div>

      {/* 6. Visibility Card */}
      <div className="glass-card">
        <div className="info-header">
          <span className="material-symbols-outlined large-icon">visibility</span>
          <span className="info-label">Visibility</span>
        </div>
        <p className="info-val">{weatherData.visibility} km</p>
      </div>

    </div>
  );
};

export default Dashboard;