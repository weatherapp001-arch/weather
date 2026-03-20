import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../App.css'; 

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const icons = ['sunny', 'cloudy', 'partly_cloudy_day', 'rainy', 'thunderstorm', 'cloudy_snowing'];

export default function Temperature() {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [activeFeature, setActiveFeature] = useState('wind'); // Defaulted to wind based on your image
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Create a reference to the chart container for auto-scrolling
  const chartRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const forecastData = useMemo(() => {
    let today = new Date();
    let data = [];
    for (let i = 0; i < 7; i++) {
      let targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      
      let high = Math.floor(Math.random() * (35 - 25 + 1)) + 25;
      let low = high - Math.floor(Math.random() * (12 - 7 + 1)) - 7;
      let icon = icons[Math.floor(Math.random() * icons.length)];
      
      if (i === 0) { high = 31; low = 22; icon = 'sunny'; }

      let aqiDataArray = [];
      let precipHeights = [];
      for (let j = 0; j < 6; j++) {
        let val = Math.floor(Math.random() * 95) + 5; 
        let color = val < 30 ? '#4CAF50' : (val < 60 ? '#FFEB3B' : '#FF9800');
        aqiDataArray.push({ height: val, color: color });
        precipHeights.push(icon === 'rainy' || icon === 'thunderstorm' ? Math.floor(Math.random() * 80) + 10 : Math.floor(Math.random() * 10));
      }

      data.push({
        dateObj: targetDate,
        dayStr: i === 0 ? 'Now' : dayNames[targetDate.getDay()],
        cardDay: i === 0 ? 'Now' : dayShort[targetDate.getDay()],
        temp: high,
        low: low,
        icon: icon,
        overviewPath: `M0,${90-i*4} Q200,${50+i*8} 400,${20+i*4} T800,${60-i*4}`,
        windPath: `M0,${70-i*2} Q150,${90-i*8} 300,${30+i*4} T600,${50-i*4} T800,${80-i*2}`,
        humidityPath: `M0,${50+i*4} Q200,${40-i*4} 400,${80-i*4} T800,${30+i*4}`,
        precipHeights,
        aqiData: aqiDataArray
      });
    }
    return data;
  }, []);

  const activeData = forecastData[activeDayIndex];
  const displayDate = activeData.dateObj.getDate();
  const displayMonth = monthNames[activeData.dateObj.getMonth()];
  const headerDateString = activeDayIndex === 0 ? 'Now' : `${activeData.dayStr}, ${displayDate} ${displayMonth}`;

  // Handle clicking a feature pill: update state AND scroll down
  const handleFeatureClick = (feature) => {
    setActiveFeature(feature);
    
    // Smoothly scroll the chart into view
    if (chartRef.current) {
      setTimeout(() => {
        chartRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50); // Small delay ensures React state updates before scrolling
    }
  };

  return (
    <>
      {/* Inline styles to completely hide the scrollbar while keeping scroll functionality */}
      <style>{`
        .hide-scroll {
          overflow-y: auto;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        .hide-scroll::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>

      {/* Added the 'hide-scroll' class here so the user can scroll up/down */}
      <div className="cloud-view-container hide-scroll" style={{ height: '100%', paddingBottom: '40px' }}>
        
        {/* Top Weather Summary */}
        <div className="current-weather-summary">
          <div className="summary-left">
            <h3>{headerDateString}</h3>
            <div className="temp-display">
              <span className="huge-temp">{activeData.temp}&deg;</span>
              <span className="material-symbols-outlined weather-icon-large" style={{ color: activeData.icon === 'sunny' ? '#FFB74D' : 'white' }}>
                {activeData.icon}
              </span>
            </div>
          </div>
          <div className="summary-right">
            <h2>{activeData.icon === 'sunny' ? 'Partly Sunny' : 'Cloudy'}</h2>
            <p>Feels like <strong>{activeData.temp + 3}&deg;</strong></p>
          </div>
        </div>

        {/* Horizontal Scroll list */}
        <div className="scroll-wrapper">
          <div className="daily-list">
            {forecastData.map((data, index) => (
              <div 
                key={index} 
                className={`daily-card ${activeDayIndex === index ? 'active' : ''}`} 
                onClick={() => setActiveDayIndex(index)}
              >
                <span className="item-time">{data.cardDay}</span>
                <span className="material-symbols-outlined item-icon" style={{ color: data.icon === 'sunny' ? '#FFB74D' : 'inherit' }}>
                  {data.icon}
                </span>
                <span className="item-temp">{data.temp}&deg;</span>
              </div>
            ))}
          </div>
          <div className="scroll-hint-right" style={{ marginBottom: '10px' }}>scroll &rarr;</div>
        </div>

        {/* Feature Selection Menu */}
        <div style={{ display: 'flex', gap: '15px', marginTop: '15px', marginBottom: '20px' }}>
          {['overview', 'precipitation', 'wind', 'air-quality', 'humidity'].map(feature => (
            <button 
              key={feature}
              onClick={() => handleFeatureClick(feature)}
              style={{
                background: activeFeature === feature ? 'rgba(0,0,0,0.25)' : 'transparent',
                border: `1px solid ${activeFeature === feature ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: activeFeature === feature ? 'white' : 'rgba(255,255,255,0.6)',
                padding: '10px 24px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '15px',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease'
              }}
            >
              {feature.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Chart Container - Added chartRef here so it knows where to scroll */}
        <div ref={chartRef} className="glass-card" style={{ flex: 'none', padding: '25px', display: 'flex', flexDirection: 'column', height: '240px' }}>
          <h4 style={{ fontSize: '18px', opacity: 0.9, marginBottom: '20px', textTransform: 'capitalize', fontWeight: 500 }}>
            {activeFeature.replace('-', ' ')} {activeFeature === 'humidity' ? '& Dew Point' : ''}
          </h4>
          
          <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
            
            {/* Y-Axis Units */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '13px', opacity: 0.7, paddingRight: '20px', textAlign: 'right', minWidth: '60px' }}>
              {activeFeature === 'overview' && <><span>40&deg;C</span><span>30&deg;C</span><span>20&deg;C</span><span>10&deg;C</span></>}
              {activeFeature === 'precipitation' && <><span>1.0 cm</span><span>0.5 cm</span><span>0 cm</span></>}
              {activeFeature === 'wind' && <><span>60 km/h</span><span>30 km/h</span><span>0 km/h</span></>}
              {activeFeature === 'air-quality' && <><span>150 AQI</span><span>100 AQI</span><span>50 AQI</span><span>0 AQI</span></>}
              {activeFeature === 'humidity' && <><span>100 %</span><span>50 %</span><span>0 %</span></>}
            </div>

            {/* Chart Visual Area */}
            <div style={{ flex: 1, position: 'relative' }}>
              
              {/* Dynamic SVG Lines */}
              {(activeFeature === 'overview' || activeFeature === 'wind' || activeFeature === 'humidity') && (
                <svg width="100%" height="100%" viewBox="0 0 800 100" preserveAspectRatio="none" style={{ transition: 'all 0.5s ease' }}>
                  {activeFeature === 'overview' && (
                    <>
                      <path d={`${activeData.overviewPath} L800,100 L0,100 Z`} fill="rgba(255, 208, 91, 0.2)" />
                      <path d={activeData.overviewPath} fill="none" stroke="#FFB74D" strokeWidth="4" />
                    </>
                  )}
                  {activeFeature === 'wind' && (
                    <path d={activeData.windPath} fill="none" stroke="#00B4D8" strokeWidth="4" />
                  )}
                  {activeFeature === 'humidity' && (
                    <>
                      <path d={`${activeData.humidityPath} L800,100 L0,100 Z`} fill="rgba(0, 180, 216, 0.3)" />
                      <path d={activeData.humidityPath} fill="none" stroke="#00B4D8" strokeWidth="3" />
                      <path d={`M0,70 Q200,60 400,80 T800,50`} fill="none" stroke="#64DFDF" strokeWidth="3" strokeDasharray="6,6" />
                    </>
                  )}
                </svg>
              )}

              {/* Dynamic Bar Charts */}
              {(activeFeature === 'precipitation' || activeFeature === 'air-quality') && (
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '100%', padding: '0 10px' }}>
                   {(activeFeature === 'precipitation' ? activeData.precipHeights : activeData.aqiData).map((val, i) => (
                     <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', width: '30px' }}>
                       <div style={{ 
                         width: '100%', 
                         height: `${activeFeature === 'precipitation' ? val : val.height}%`, 
                         backgroundColor: activeFeature === 'precipitation' ? '#00B4D8' : val.color,
                         borderRadius: '6px 6px 0 0',
                         transition: 'all 0.5s ease'
                       }}></div>
                     </div>
                   ))}
                 </div>
              )}

              {/* Mock X-Axis */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', opacity: 0.7, position: 'absolute', bottom: '-25px', left: 0, right: 0 }}>
                <span>12 AM</span><span>4 AM</span><span>8 AM</span><span>12 PM</span><span>4 PM</span><span>8 PM</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}