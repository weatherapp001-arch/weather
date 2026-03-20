import React, { useState } from 'react';

// Full 24-hour dataset preserved
const MOCK_HOURLY = [
  { time: 'Now', icon: 'sunny', temp: 31 },
  { time: '9am', icon: 'sunny', temp: 31 },
  { time: '10am', icon: 'partly_cloudy_day', temp: 34 },
  { time: '11am', icon: 'partly_cloudy_day', temp: 35 },
  { time: '12pm', icon: 'cloud', temp: 28 }, 
  { time: '1pm', icon: 'grain', temp: 24 },
  { time: '2pm', icon: 'partly_cloudy_day', temp: 34 },
  { time: '3pm', icon: 'thunderstorm', temp: 22 },
  { time: '4pm', icon: 'thunderstorm', temp: 21 },
  { time: '5pm', icon: 'rainy', temp: 24 }, 
  { time: '6pm', icon: 'partly_cloudy_day', temp: 26 },
  { time: '7pm', icon: 'clear_night', temp: 24 },
  { time: '8pm', icon: 'clear_night', temp: 22 },
  { time: '9pm', icon: 'clear_night', temp: 21 },
  { time: '10pm', icon: 'partly_cloudy_night', temp: 20 },
  { time: '11pm', icon: 'clear_night', temp: 19 },
  { time: '12am', icon: 'clear_night', temp: 18 },
  { time: '1am', icon: 'cloud', temp: 18 },
  { time: '2am', icon: 'clear_night', temp: 17 },
  { time: '3am', icon: 'clear_night', temp: 17 },
  { time: '4am', icon: 'clear_night', temp: 17 },
  { time: '5am', icon: 'partly_cloudy_day', temp: 19 },
  { time: '6am', icon: 'sunny', temp: 21 },
  { time: '7am', icon: 'sunny', temp: 23 },
  { time: '8am', icon: 'sunny', temp: 26 }
];

const getWeatherVibe = (icon) => {
  const c = icon.toLowerCase();
  if (c === 'sunny') return { comment: 'Bright and Sunny', vibe: 'sunny' };
  if (c === 'grain') return { comment: 'Light Showers', vibe: 'little_rain' };
  if (c.includes('thunderstorm') || c.includes('heavy_rain')) return { comment: 'Stormy Weather', vibe: 'heavy_rain' };
  if (c.includes('rain')) return { comment: 'Rain Expected', vibe: 'rainy' };
  if (c.includes('night')) return { comment: 'Clear and Quiet', vibe: 'night' };
  return { comment: 'Partly Sunny', vibe: 'cloudy' };
};

const DynamicWeatherSnail = ({ vibe }) => {
  const isSunny = vibe === 'sunny';
  const isLittleRain = vibe === 'little_rain';
  const isHeavyRain = vibe === 'heavy_rain' || vibe === 'rainy';
  const isNight = vibe === 'night';

  return (
    <svg viewBox="0 0 100 150" width="140" height="140" style={{ filter: 'drop-shadow(0px 8px 12px rgba(0,0,0,0.3))' }}>
      
      {/* --- SKY LAYER (Elements floating high) --- */}
      {isNight && (
        <g fill="white" opacity="0.9">
          <circle cx="45" cy="15" r="1.2"/> <circle cx="52" cy="18" r="1.2"/> <circle cx="59" cy="21" r="1.2"/>
          <circle cx="35" cy="5" r="2"/> <circle cx="70" cy="10" r="2.2"/>
          <circle cx="30" cy="40" r="2.2"/> <circle cx="65" cy="45" r="2"/>
        </g>
      )}

      {(isLittleRain || isHeavyRain) && (
        <path 
          d="M 15 25 Q 15 10 35 10 Q 50 2 65 12 Q 85 8 85 25 Q 85 40 65 35 L 35 35 Q 15 35 15 25 Z" 
          fill={isLittleRain ? "#FFFFFF" : "#455A64"} 
        />
      )}

      {vibe === 'heavy_rain' && (
        <path d="M 50 25 L 42 45 L 55 45 L 48 65" fill="none" stroke="#FFD54F" strokeWidth="2.5" strokeLinecap="round"/>
      )}

      {(isLittleRain || isHeavyRain) && (
        <g fill="#90CAF9">
          {[...Array(isHeavyRain ? 10 : 4)].map((_, i) => (
            <path 
              key={i} 
              d={`M ${20 + i * (isHeavyRain ? 8 : 20)} 40 Q ${23 + i * (isHeavyRain ? 8 : 20)} 48 ${20 + i * (isHeavyRain ? 8 : 20)} 55 Z`} 
              opacity={isHeavyRain ? "0.8" : "0.7"}
            />
          ))}
        </g>
      )}

      {/* --- SNAIL MASCOT LAYER --- */}
      <g transform="translate(0, 45)">
        
        {/* Complete Body */}
        <path d="M 20 100 Q 50 100 85 100 A 5 5 0 0 0 85 85 Q 55 85 45 95 L 30 65 A 8 8 0 0 0 15 65 L 20 100 Z" fill="#A3E4D7" />
        
        {/* Shell */}
        <circle cx="60" cy="80" r="22" fill="#F5CBA7" />
        <path d="M 60 80 A 6 6 0 0 1 66 86 A 12 12 0 0 1 48 80 A 18 18 0 0 1 75 73" fill="none" stroke="#E67E22" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Head/Antennas/Eyes */}
        <line x1="26" y1="70" x2="16" y2="50" stroke="#A3E4D7" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="70" x2="38" y2="50" stroke="#A3E4D7" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="16" cy="50" r="3.5" fill={isNight ? "#546E7A" : "#333"} />
        <circle cx="38" cy="50" r="3.5" fill={isNight ? "#546E7A" : "#333"} />

        {isSunny && (
          <>
            <circle cx="15" cy="20" r="14" fill="#FFB74D" />
            <g>
              <path d="M 12 47 L 42 47 L 39 54 L 33 54 L 29 47 L 25 47 L 21 54 L 15 54 Z" fill="#111" />
              <line x1="12" y1="47" x2="42" y2="47" stroke="#111" strokeWidth="2" />
            </g>
          </>
        )}

        {isNight && (
          <g fill="white" fontSize="10" fontWeight="bold">
            <text x="42" y="45">z</text>
            <text x="52" y="35" fontSize="8">z</text>
          </g>
        )}

        {/* Heavy Rain: Umbrella - Raised over head, straight */}
        {isHeavyRain && (
          <g transform="translate(0, 5)"> 
            <path d="M 30 85 L 30 15" stroke="#5D4037" strokeWidth="3" /> 
            <path d="M 2 25 Q 30 -5 58 25 Z" fill="#546E7A" /> 
          </g>
        )}
      </g>
    </svg>
  );
};

export default function Cloud() {
  const [activeHourIndex, setActiveHourIndex] = useState(0);
  const selectedHour = MOCK_HOURLY[activeHourIndex] || MOCK_HOURLY[0];
  const { comment, vibe } = getWeatherVibe(selectedHour.icon);

  return (
    <div className="cloud-view-container hide-scroll" style={{ padding: '0 10px' }}>
      
      {/* Top Glass Summary Card */}
      <div className="glass-card" style={{ flex: 'none', height: '300px', display: 'flex', position: 'relative', padding: 0, overflow: 'hidden', marginBottom: '30px' }}>
        <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px' }}>
          
          <div className="summary-left" style={{ textAlign: 'left', flex: 1, color: vibe === 'night' ? 'white' : 'inherit' }}>
            <h3>{selectedHour.time === 'Now' ? 'Now' : `Today, ${selectedHour.time}`}</h3>
            <div className="temp-display">
              <span className="huge-temp">{selectedHour.temp}°</span>
              <span className="material-symbols-outlined weather-icon-large" style={{ color: selectedHour.icon === 'sunny' ? '#FFB74D' : 'white' }}>
                {selectedHour.icon}
              </span>
            </div>
          </div>

          <div className="summary-center" style={{ flex: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <DynamicWeatherSnail vibe={vibe} />
          </div>

          <div className="summary-right" style={{ textAlign: 'right', flex: 1, color: vibe === 'night' ? 'white' : 'inherit' }}>
            <h2>{comment}</h2>
            <p>Feels like <strong>{selectedHour.temp + 3}°</strong></p>
          </div>
        </div>
      </div>

      {/* Hourly Card List */}
      <div className="scroll-wrapper">
        <div className="hourly-list">
          {MOCK_HOURLY.map((item, idx) => (
            <div 
              key={idx} 
              className={`hourly-item ${activeHourIndex === idx ? 'active' : ''}`}
              onClick={() => setActiveHourIndex(idx)}
              style={{
                background: activeHourIndex === idx ? 'rgba(0,0,0,0.25)' : '',
                borderColor: activeHourIndex === idx ? 'rgba(255,255,255,0.2)' : '',
                transform: activeHourIndex === idx ? 'translateY(-8px)' : '',
                boxShadow: activeHourIndex === idx ? '0 8px 20px rgba(0,0,0,0.2)' : ''
              }}
            >
              <span className="item-time">{item.time}</span>
              <span className="material-symbols-outlined item-icon" style={{ color: item.icon === 'sunny' ? '#FFB74D' : 'inherit' }}>
                {item.icon}
              </span>
              <span className="item-temp">{item.temp}°</span>
            </div>
          ))}
        </div>
        <div className="scroll-hint-right" style={{ marginBottom: '10px' }}>scroll &rarr;</div>
      </div>
    </div>
  );
}