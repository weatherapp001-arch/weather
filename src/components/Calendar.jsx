import React, { useState, useEffect, useRef } from 'react';
import '../App.css';

const OPENWEATHER_API_KEY = '2e24befa68c3a074d74625c8ed3099a0';
const GEO_URL = 'https://api.openweathermap.org/data/2.5/weather';

const generateSmoothPath = (dataPoints, maxValue, minValue = 0, height = 300, padding = 60) => {
  if (!dataPoints || dataPoints.length === 0) return '';
  const points = dataPoints.length === 1 ? [dataPoints[0], dataPoints[0]] : dataPoints;
  
  const range = (maxValue - minValue) || 1;
  const getY = (val) => {
    const safeVal = Math.max(minValue, Math.min(maxValue, val));
    return height - padding - (((safeVal - minValue) / range) * (height - padding * 2));
  };
  
  const stepX = 1000 / Math.max(1, points.length - 1);
  let path = `M0,${getY(points[0])}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const x1 = i * stepX;
    const y1 = getY(points[i]);
    const x2 = (i + 1) * stepX;
    const y2 = getY(points[i + 1]);
    const cx = x1 + stepX / 2;
    path += ` C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
  }
  return path;
};

const generateSpikePath = (dataPoints, maxValue) => {
  if (!dataPoints || dataPoints.length === 0) return { fillPath: '', strokePath: '' };
  let fillPath = "";
  let strokePath = "";
  const stepX = 1000 / Math.max(1, dataPoints.length - 1);
  
  for (let i = 0; i < dataPoints.length; i++) {
    const x = i * stepX;
    const val = dataPoints[i];
    if (val > 0.1) {
      const y = 300 - ((val / maxValue) * 220); 
      fillPath += `M${x-6},300 L${x},${y} L${x+6},300 `;
      strokePath += `M${x},300 L${x},${y} `;
    }
  }
  return { fillPath, strokePath };
};

export default function Calendar({ searchQuery }) {
  const [activeTab, setActiveTab] = useState('Temperature');
  const [hoverData, setHoverData] = useState(null);
  const chartRef = useRef(null);

  const [locationName, setLocationName] = useState('Locating...');
  const [realData, setRealData] = useState({ dates: [], highs: [], lows: [], precip: [], humid: [], winds: [] });
  const [loading, setLoading] = useState(true);

  const tabs = [
    { name: 'Temperature', icon: 'device_thermostat' },
    { name: 'Precipitation', icon: 'water_drop' },
    { name: 'Humidity', icon: 'humidity_percentage' },
    { name: 'Wind', icon: 'air' }
  ];

  useEffect(() => {
    const fetchRealHistoricalData = async (query) => {
      setLoading(true);
      try {
        let lat, lon, cityName;
        
        // FIX 1: Always fetch the actual city name, even when using GPS coordinates
        if (query.lat && query.lon) {
          lat = query.lat; lon = query.lon;
          const geoRes = await fetch(`${GEO_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`);
          const geoData = await geoRes.json();
          cityName = geoData.name;
          if (cityName === 'Jahāngīrābād' || cityName === 'George Town') cityName = 'Prayagraj';
          cityName = `${cityName}, ${geoData.sys.country}`;
        } else if (query.city) {
          const geoRes = await fetch(`${GEO_URL}?q=${query.city}&appid=${OPENWEATHER_API_KEY}`);
          const geoData = await geoRes.json();
          if (geoData.cod !== 200 && geoData.cod !== "200") throw new Error("City not found");
          
          lat = geoData.coord.lat;
          lon = geoData.coord.lon;
          cityName = query.name ? query.name.split(',')[0] : geoData.name;
          if (cityName === 'Jahāngīrābād' || cityName === 'George Town') cityName = 'Prayagraj';
          cityName = `${cityName}, ${geoData.sys.country}`;
        }
        
        setLocationName(cityName);

        const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&hourly=relative_humidity_2m&past_days=30&forecast_days=1&timezone=auto`;
        
        const res = await fetch(meteoUrl);
        const data = await res.json();

        const dates = data.daily.time; 
        const highs = data.daily.temperature_2m_max.map(Math.round);
        const lows = data.daily.temperature_2m_min.map(Math.round);
        const precip = data.daily.precipitation_sum;
        const winds = data.daily.wind_speed_10m_max.map(Math.round);

        const humid = [];
        for (let i = 0; i < dates.length; i++) {
          const dayHourlyHumidity = data.hourly.relative_humidity_2m.slice(i * 24, (i + 1) * 24);
          const dailyAvg = dayHourlyHumidity.reduce((a, b) => a + b, 0) / 24;
          humid.push(Math.round(dailyAvg));
        }

        setRealData({ dates, highs, lows, precip, humid, winds });
        
      } catch (err) {
        console.error("Failed to fetch historical data:", err);
        setLocationName('Prayagraj, IN (Offline)');
      } finally {
        setLoading(false);
      }
    };

    if (searchQuery) {
      fetchRealHistoricalData(searchQuery);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchRealHistoricalData({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => fetchRealHistoricalData({ city: 'Prayagraj', name: 'Prayagraj' })
      );
    }
  }, [searchQuery]);

  const handleMouseMove = (e) => {
    if (!chartRef.current || realData.dates.length === 0) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentX = Math.max(0, Math.min(1, x / rect.width));
    
    const dataIndex = Math.min(realData.dates.length - 1, Math.round(percentX * (realData.dates.length - 1)));
    
    const dateObj = new Date(realData.dates[dataIndex]);
    const dateStr = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getFullYear()}`;

    let values = {};
    if (activeTab === 'Temperature') {
      values = { high: realData.highs[dataIndex], low: realData.lows[dataIndex] };
    } else if (activeTab === 'Precipitation') {
      values = { precip: realData.precip[dataIndex] };
    } else if (activeTab === 'Humidity') {
      values = { avg: realData.humid[dataIndex] };
    } else if (activeTab === 'Wind') {
      values = { avg: realData.winds[dataIndex] };
    }

    setHoverData({
      x, dateStr, values,
      tooltipX: x > rect.width - 180 ? x - 190 : x + 15
    });
  };

  if (loading || realData.dates.length === 0) {
    return <div style={{ padding: '40px', color: 'white' }}><h3>Fetching 30-Day Historical Data...</h3></div>;
  }

  const maxTemp = Math.ceil(Math.max(...realData.highs) + 5);
  const minTemp = Math.floor(Math.min(...realData.lows) - 5);
  const tempPathHigh = generateSmoothPath(realData.highs, maxTemp, minTemp);
  const tempPathLow = generateSmoothPath(realData.lows, maxTemp, minTemp);
  
  const maxPrecip = Math.ceil(Math.max(...realData.precip, 5)); 
  const precipPaths = generateSpikePath(realData.precip, maxPrecip);
  
  const humidPath = generateSmoothPath(realData.humid, 100, 0);
  
  const maxWind = Math.ceil(Math.max(...realData.winds, 20) + 5);
  const windPath = generateSmoothPath(realData.winds, maxWind, 0);

  // FIX 2: Generate Month and Date labels for the X-Axis
  const xLabels = realData.dates.map((dateStr, idx) => {
    if (idx === 0 || idx === realData.dates.length - 1 || idx % 5 === 0) {
      const d = new Date(dateStr);
      return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`; 
    }
    return '';
  });

  return (
    <>
      <style>{`
        .hide-scroll { overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .dropdown-btn { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 6px 16px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; }
        .tab-btn { background: transparent; border: 1px solid transparent; color: rgba(255,255,255,0.7); padding: 8px 24px; border-radius: 25px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 15px; transition: all 0.3s ease; }
        .tab-btn.active { background: rgba(255, 208, 91, 0.1); border-color: #FFB74D; color: #FFB74D; }
        .y-axis span { display: block; height: 20%; text-align: right; }
      `}</style>

      <div className="cloud-view-container hide-scroll" style={{ height: '100%', paddingBottom: '20px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '25px', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '15px' }}>
            Historical Trends
            <span style={{ fontSize: '18px', fontWeight: 400, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '15px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
              {locationName}
            </span>
          </h2>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button className="dropdown-btn"><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_today</span>Last 30 Days</button>
          </div>
        </div>

        <div className="glass-card" style={{ flex: 1, padding: '25px', display: 'flex', flexDirection: 'column', minHeight: '450px' }}>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {tabs.map(tab => (
                <button key={tab.name} className={`tab-btn ${activeTab === tab.name ? 'active' : ''}`} onClick={() => setActiveTab(tab.name)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
            
            <div className="y-axis" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '13px', opacity: 0.8, paddingRight: '20px', minWidth: '60px' }}>
              {activeTab === 'Temperature' && <><span>{maxTemp}&deg;</span><span>{Math.round((maxTemp+minTemp)/2)}&deg;</span><span>{minTemp}&deg;</span></>}
              {activeTab === 'Precipitation' && <><span>{maxPrecip} mm</span><span>{maxPrecip/2} mm</span><span>0 mm</span></>}
              {activeTab === 'Humidity' && <><span>100%</span><span>50%</span><span>0%</span></>}
              {activeTab === 'Wind' && <><span>{maxWind} km/h</span><span>{Math.round(maxWind/2)} km/h</span><span>0 km/h</span></>}
            </div>

            <div 
              ref={chartRef} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverData(null)}
              style={{ flex: 1, position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.2)', cursor: 'crosshair', overflow: 'hidden' }}
            >
              {hoverData && (
                <>
                  <div style={{ position: 'absolute', left: hoverData.x, top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.8)', zIndex: 15, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', left: hoverData.tooltipX, top: '25%', background: 'rgba(0,0,0,0.9)', padding: '12px 16px', borderRadius: '10px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.2)', zIndex: 20, pointerEvents: 'none', minWidth: '160px' }}>
                    <div style={{ marginBottom: '8px', fontWeight: 600 }}>{hoverData.dateStr}</div>
                    {activeTab === 'Temperature' && (
                      <>
                        <div style={{ marginBottom: '4px' }}><span style={{ color: '#FF5252' }}>●</span> Daily high: {hoverData.values.high}&deg;</div>
                        <div><span style={{ color: '#448AFF' }}>●</span> Daily low: {hoverData.values.low}&deg;</div>
                      </>
                    )}
                    {activeTab === 'Precipitation' && <div><span style={{ color: '#00E5FF' }}>●</span> Precipitation: {hoverData.values.precip} mm</div>}
                    {activeTab === 'Humidity' && <div><span style={{ color: '#00E5FF' }}>●</span> Avg Humidity: {hoverData.values.avg}%</div>}
                    {activeTab === 'Wind' && <div><span style={{ color: '#00E5FF' }}>●</span> Max Wind: {hoverData.values.avg} km/h</div>}
                  </div>
                </>
              )}

              <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none" style={{ pointerEvents: 'none', transition: 'all 0.5s ease' }}>
                {activeTab === 'Temperature' && (
                  <>
                    <path d={`${tempPathHigh} L1000,300 L0,300 Z`} fill="rgba(255, 82, 82, 0.15)" />
                    <path d={tempPathHigh} fill="none" stroke="#FF5252" strokeWidth="2.5" />
                    <path d={`${tempPathLow} L1000,300 L0,300 Z`} fill="rgba(68, 138, 255, 0.15)" />
                    <path d={tempPathLow} fill="none" stroke="#448AFF" strokeWidth="2.5" />
                  </>
                )}
                {activeTab === 'Precipitation' && (
                  <>
                    <path d={`${precipPaths.fillPath}`} fill="rgba(0, 229, 255, 0.2)" />
                    <path d={precipPaths.strokePath} fill="none" stroke="#00E5FF" strokeWidth="3" strokeLinecap="round" />
                  </>
                )}
                {activeTab === 'Humidity' && (
                  <>
                    <path d={`${humidPath} L1000,300 L0,300 Z`} fill="rgba(0, 229, 255, 0.2)" />
                    <path d={humidPath} fill="none" stroke="#00E5FF" strokeWidth="2.5" />
                  </>
                )}
                {activeTab === 'Wind' && (
                  <>
                    <path d={`${windPath} L1000,300 L0,300 Z`} fill="rgba(0, 229, 255, 0.1)" />
                    <path d={windPath} fill="none" stroke="#00E5FF" strokeWidth="2.5" />
                  </>
                )}
              </svg>

              {/* REAL DATES ON X-AXIS WITH MONTHS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', opacity: 0.8, position: 'absolute', bottom: '-25px', left: '0px', right: '0px', pointerEvents: 'none' }}>
                {xLabels.map((lbl, i) => (
                  <span key={i} style={{ width: '40px', textAlign: 'center' }}>{lbl}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}