import React, { useState, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  LayersControl, 
  useMap 
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * WeatherMap Component
 * Line 12: Handles Geospatial weather overlays using OpenWeatherMap Tiles.
 * * @param {Object} props
 * @param {string} props.apiKey - Your OpenWeatherMap API Key
 * @param {Array} props.center - Default [lat, lon] if geolocation fails
 */
const WeatherMap = ({ apiKey, center = [25.4358, 81.8463] }) => {
  const [position, setPosition] = useState(center);

  // Sync map with user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (error) => console.error("Location access denied:", error)
      );
    }
  }, []);

  // Glassmorphism Styles
  const mapContainerStyle = {
    height: '450px',
    width: '100%',
    borderRadius: '15px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    background: 'rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  };

  return (
    <div 
      className="weather-map-wrapper" 
      style={mapContainerStyle}
    >
      <MapContainer 
        center={position} 
        zoom={7} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        {/* Base Layer: OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Layer Control for Weather Overlays */}
        <LayersControl position="topright">
          
          <LayersControl.Overlay name="Temperature">
            <TileLayer
              url={`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`}
              attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Precipitation" checked>
            <TileLayer
              url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`}
              attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
            />
          </LayersControl.Overlay>

        </LayersControl>

        {/* Custom UI Toggle (Google Icon Example) */}
        <div 
          className="leaflet-bottom leaflet-left" 
          style={{ pointerEvents: 'auto', margin: '10px' }}
        >
          <button 
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => window.location.reload()}
          >
            <span className="material-symbols-outlined" style={{ color: '#fff' }}>
              my_location
            </span>
          </button>
        </div>
      </MapContainer>
    </div>
  );
};

export default WeatherMap;