import React, { useState, useEffect, useRef } from 'react';

// API Configuration
const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const AIR_URL = 'https://api.openweathermap.org/data/2.5/air_pollution/forecast'; 

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

const generateSmoothPath = (dataPoints, maxValue, minValue = 0) => {
  if (!dataPoints || dataPoints.length === 0) return 'M0,100 L800,100'; 
  let points = [...dataPoints];
  if (points.length === 1) points.push(points[0]); 
  const range = maxValue - minValue || 1;
  const getY = (val) => 100 - (((Math.max(minValue, Math.min(maxValue, val)) - minValue) / range) * 100); 
  const stepX = 800 / Math.max(1, points.length - 1);
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

export default function Temperature({ searchQuery }) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [activeFeature, setActiveFeature] = useState('overview');
  const [forecastData, setForecastData] = useState([]);
  const [locationName, setLocationName] = useState('Locating...');
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);

  const fetchChartData = async (query) => {
    setLoading(true);
    try {
      let url = '';
      if (query.lat && query.lon) {
        url = `${FORECAST_URL}?lat=${query.lat}&lon=${query.lon}&units=metric&appid=${API_KEY}`;
      } else if (query.city) {
        url = `${FORECAST_URL}?q=${query.city}&units=metric&appid=${API_KEY}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.cod === "200") {
        let cityName = query.name ? query.name.split(',')[0] : data.city.name;
        if (cityName === 'Jahāngīrābād' || cityName === 'George Town') cityName = 'Prayagraj';
        setLocationName(`${cityName}, ${data.city.country}`);

        const airRes = await fetch(`${AIR_URL}?lat=${data.city.coord.lat}&lon=${data.city.coord.lon}&appid=${API_KEY}`);
        const airData = await airRes.json();

        const dailyBuckets = [];
        let currentDayIndex = -1;
        let lastDayDate = -1;

        data.list.forEach((item) => {
          const dateObj = new Date(item.dt * 1000);
          const dayDate = dateObj.getDate();
          if (dayDate !== lastDayDate && dailyBuckets.length < 5) {
            currentDayIndex++;
            lastDayDate = dayDate;
            dailyBuckets.push({
              dateObj: dateObj,
              dayStr: currentDayIndex === 0 ? 'Now' : dayNames[dateObj.getDay()],
              cardDay: currentDayIndex === 0 ? 'Now' : dayShort[dateObj.getDay()],
              temps: [], winds: [], humidities: [], rainVolume: [], aqiValues: [], aqiColors: [], aqiHeights: [], times: [] 
            });
          }
          if (currentDayIndex >= 0 && currentDayIndex < 5 && dailyBuckets[currentDayIndex].temps.length < 6) {
            const bucket = dailyBuckets[currentDayIndex];
            bucket.temps.push(item.main.temp);
            bucket.winds.push(item.wind.speed * 3.6); 
            bucket.humidities.push(item.main.humidity);
            bucket.rainVolume.push(item.rain ? item.rain['3h'] : 0);
            bucket.times.push(dateObj.toLocaleTimeString([], { hour: 'numeric', hour12: true }).replace(' ', ''));
            
            // LOGIC: Calculate Numerical AQI using PM2.5 (Realistic scale 0-200)
            const matchingAir = airData.list.find(a => Math.abs(a.dt - item.dt) < 10000);
            const pm25 = matchingAir ? matchingAir.components.pm2_5 : 20;
            const displayAqi = Math.round(pm25 * 3.2); // Scaling multiplier to match standard AQI numbers
            
            bucket.aqiValues.push(displayAqi);
            // Height logic for 0-200 scale
            bucket.aqiHeights.push(Math.min((displayAqi / 200) * 100, 100));
            
            // Color logic based on standard AQI thresholds
            let color = '#4CAF50'; // Good
            if (displayAqi > 50) color = '#FFEB3B'; // Moderate
            if (displayAqi > 100) color = '#FF9800'; // Unhealthy for sensitive
            if (displayAqi > 150) color = '#F44336'; // Unhealthy
            bucket.aqiColors.push(color);
          }
        });

        setForecastData(dailyBuckets.map(b => ({ ...b, temp: Math.round(Math.max(...b.temps)), icon: mapApiToMaterialIcon(800, '01d') })));
        setActiveDayIndex(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery) fetchChartData(searchQuery);
    else {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchChartData({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => fetchChartData({ city: 'Prayagraj', name: 'Prayagraj' })
      );
    }
  }, [searchQuery]);

  if (loading || forecastData.length === 0) return <div style={{ color: 'white', padding: '40px' }}>Loading...</div>;

  const activeData = forecastData[activeDayIndex];
  const maxTemp = Math.ceil(Math.max(...activeData.temps) + 2);
  const minTemp = Math.floor(Math.min(...activeData.temps) - 2);
  const maxWind = Math.ceil(Math.max(...activeData.winds, 5) + 5);
  const maxRain = Math.max(...activeData.rainVolume, 1);

  return (
    <div className="cloud-view-container hide-scroll" style={{ height: '100%', paddingBottom: '40px' }}>
      <div className="current-weather-summary">
        <div className="summary-left">
          <h3>{activeDayIndex === 0 ? 'Now' : `${activeData.dayStr}, ${activeData.dateObj.getDate()} ${monthNames[activeData.dateObj.getMonth()]}`}</h3>
          <div className="temp-display">
            <span className="huge-temp">{activeData.temp}&deg;</span>
            <span className="material-symbols-outlined weather-icon-large" style={{ color: '#FFB74D' }}>sunny</span>
          </div>
          <h4 style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '18px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '5px' }}>location_on</span>
            {locationName}
          </h4>
        </div>
        <div className="summary-right"><h2>Detailed View</h2></div>
      </div>

      <div className="scroll-wrapper">
        <div className="daily-list">
          {forecastData.map((data, index) => (
            <div key={index} className={`daily-card ${activeDayIndex === index ? 'active' : ''}`} onClick={() => setActiveDayIndex(index)}>
              <span className="item-time">{data.cardDay}</span>
              <span className="material-symbols-outlined item-icon" style={{ color: '#FFB74D' }}>sunny</span>
              <span className="item-temp">{data.temp}&deg;</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', margin: '15px 0 20px 0' }}>
        {['overview', 'precipitation', 'wind', 'air-quality', 'humidity'].map(f => (
          <button key={f} onClick={() => { setActiveFeature(f); chartRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
            style={{ background: activeFeature === f ? 'rgba(0,0,0,0.25)' : 'transparent', border: `1px solid ${activeFeature === f ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`, color: activeFeature === f ? 'white' : 'rgba(255,255,255,0.6)', padding: '10px 24px', borderRadius: '25px', cursor: 'pointer', textTransform: 'capitalize' }}>
            {f.replace('-', ' ')}
          </button>
        ))}
      </div>

      <div ref={chartRef} className="glass-card" style={{ flex: 'none', padding: '25px', display: 'flex', flexDirection: 'column', height: '240px' }}>
        <h4 style={{ fontSize: '18px', opacity: 0.9, marginBottom: '20px', textTransform: 'capitalize' }}>{activeFeature.replace('-', ' ')}</h4>
        <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '13px', opacity: 0.7, paddingRight: '20px', textAlign: 'right', minWidth: '60px' }}>
            {activeFeature === 'overview' && <><span>{maxTemp}&deg;</span><span>{Math.round((maxTemp+minTemp)/2)}&deg;</span><span>{minTemp}&deg;</span></>}
            {activeFeature === 'precipitation' && <><span>{maxRain.toFixed(1)} mm</span><span>{(maxRain/2).toFixed(1)}</span><span>0</span></>}
            {activeFeature === 'wind' && <><span>{maxWind} km/h</span><span>{Math.round(maxWind/2)}</span><span>0</span></>}
            
            {/* UPDATED: Numerical Y-Axis for AQI (200 down to 0) */}
            {activeFeature === 'air-quality' && <><span>200</span><span>100</span><span>0</span></>}
            
            {activeFeature === 'humidity' && <><span>100 %</span><span>50 %</span><span>0 %</span></>}
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {(activeFeature === 'overview' || activeFeature === 'wind' || activeFeature === 'humidity') && (
              <svg width="100%" height="100%" viewBox="0 0 800 100" preserveAspectRatio="none">
                <path d={generateSmoothPath(activeFeature==='overview'?activeData.temps:activeFeature==='wind'?activeData.winds:activeData.humidities, activeFeature==='overview'?maxTemp:activeFeature==='wind'?maxWind:100, activeFeature==='overview'?minTemp:0)} fill="none" stroke={activeFeature==='overview'?'#FFB74D':'#00B4D8'} strokeWidth="4" />
              </svg>
            )}
            {(activeFeature === 'precipitation' || activeFeature === 'air-quality') && (
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '100%', padding: '0 10px' }}>
                 {activeData.temps.map((_, i) => (
                   <div key={i} style={{ 
                     width: '30px', 
                     height: `${activeFeature==='precipitation'?Math.min((activeData.rainVolume[i]/maxRain)*100,100):activeData.aqiHeights[i]}%`, 
                     backgroundColor: activeFeature==='precipitation'?'#00B4D8':activeData.aqiColors[i], 
                     borderRadius: '6px 6px 0 0',
                     position: 'relative'
                   }}>
                     {/* Show numerical AQI value above the bar on hover (Optional feature) */}
                     {activeFeature === 'air-quality' && (
                        <span style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', opacity: 0.8 }}>
                          {activeData.aqiValues[i]}
                        </span>
                     )}
                   </div>
                 ))}
               </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', opacity: 0.7, position: 'absolute', bottom: '-25px', left: 0, right: 0 }}>
              {activeData.times.map((t, idx) => <span key={idx}>{t}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}