import React, { useState, useRef } from 'react';
import '../App.css';

export default function Calendar() {
  const [activeTab, setActiveTab] = useState('Temperature');
  const [hoverData, setHoverData] = useState(null);
  const chartRef = useRef(null);

  const tabs = [
    { name: 'Temperature', icon: 'device_thermostat' },
    { name: 'Precipitation', icon: 'water_drop' },
    { name: 'Humidity', icon: 'humidity_percentage' },
    { name: 'Wind', icon: 'air' }
  ];

  // Helper to render the specific legend based on the active tab
  const renderLegend = () => {
    switch (activeTab) {
      case 'Temperature':
        return (
          <>
            <label className="legend-item"><input type="checkbox" defaultChecked /> <span style={{ color: '#448AFF' }}>—</span> Daily low</label>
            <label className="legend-item"><input type="checkbox" defaultChecked /> <span style={{ color: '#FF5252' }}>—</span> Daily high</label>
            <label className="legend-item"><input type="checkbox" defaultChecked /> <span style={{ color: '#448AFF', borderBottom: '2px dashed #448AFF', width: '15px', display: 'inline-block' }}></span> 30 day forecast</label>
            <label className="legend-item"><input type="checkbox" defaultChecked /> <span style={{ color: 'white', borderBottom: '2px dashed white', width: '15px', display: 'inline-block' }}></span> Historical daily average</label>
          </>
        );
      case 'Precipitation':
        return (
          <>
            <label className="legend-item"><input type="radio" name="precip" /> Rain</label>
            <label className="legend-item"><input type="radio" name="precip" /> Snow</label>
            <label className="legend-item"><input type="radio" name="precip" defaultChecked /> Precipitation</label>
            <label className="legend-item"><input type="checkbox" defaultChecked /> <span style={{ color: '#00E5FF' }}>—</span> Daily precipitation</label>
          </>
        );
      case 'Humidity':
      case 'Wind':
        return (
          <>
            <label className="legend-item"><input type="checkbox" defaultChecked /> <span style={{ color: '#00E5FF' }}>—</span> Daily average</label>
            <label className="legend-item"><input type="checkbox" defaultChecked /> <span style={{ color: '#00E5FF', borderBottom: '2px dashed #00E5FF', width: '15px', display: 'inline-block' }}></span> 30 day forecast</label>
            <label className="legend-item"><input type="checkbox" defaultChecked /> <span style={{ color: 'white', borderBottom: '2px dashed white', width: '15px', display: 'inline-block' }}></span> Historical daily average</label>
          </>
        );
      default: return null;
    }
  };

  // Handles dynamic tooltip data generation based on mouse position
  const handleMouseMove = (e) => {
    if (!chartRef.current) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Calculate percentage across the chart (0.0 to 1.0)
    const percentX = Math.max(0, Math.min(1, x / rect.width));
    
    // Map percentage to a mock date (Starting May 1st, spanning approx 1 year)
    const startDate = new Date(2025, 4, 1); // May 1, 2025
    const hoverDate = new Date(startDate.getTime() + percentX * 365 * 24 * 60 * 60 * 1000);
    
    const day = hoverDate.getDate();
    const month = hoverDate.toLocaleString('default', { month: 'long' });
    const year = hoverDate.getFullYear();
    const dateStr = `${day} ${month} ${year}`;

    // Generate smooth mock data based on the percentage (using sine waves for realistic looking trends)
    let values = {};
    const baseSine = Math.sin(percentX * Math.PI * 2);
    const complexSine = Math.sin(percentX * Math.PI * 8); 
    
    if (activeTab === 'Temperature') {
      const high = Math.floor(25 + baseSine * 15 + complexSine * 3);
      values = {
        high: high,
        histHigh: high + 2,
        low: Math.floor(high - 12 - Math.abs(complexSine * 2)),
        histLow: Math.floor(high - 10)
      };
    } else if (activeTab === 'Precipitation') {
      const isRaining = percentX > 0.25 && percentX < 0.65;
      values = {
        precip: isRaining ? (Math.abs(complexSine) * 3).toFixed(1) : '0',
        prob: Math.floor(10 + Math.abs(baseSine) * 70)
      };
    } else if (activeTab === 'Humidity') {
      const avg = (55 + baseSine * 25 + complexSine * 5).toFixed(1);
      values = {
        avg: avg,
        histAvg: (parseFloat(avg) - 3.5).toFixed(1)
      };
    } else if (activeTab === 'Wind') {
      const avg = (6 + Math.abs(complexSine) * 6 + baseSine * 2).toFixed(1);
      values = {
        avg: avg,
        histAvg: (parseFloat(avg) + 1.5).toFixed(1),
        dir: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.abs(complexSine) * 8) % 8]
      };
    }

    setHoverData({
      x, 
      dateStr, 
      values,
      tooltipX: x > rect.width - 220 ? x - 230 : x + 15
    });
  };

  return (
    <>
      <style>{`
        .hide-scroll { overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .dropdown-btn { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 6px 16px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; }
        .tab-btn { background: transparent; border: 1px solid transparent; color: rgba(255,255,255,0.7); padding: 8px 24px; border-radius: 25px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 15px; transition: all 0.3s ease; }
        .tab-btn.active { background: rgba(255, 208, 91, 0.1); border-color: #FFB74D; color: #FFB74D; }
        .y-axis span { display: block; height: 20%; text-align: right; }
        .legend-item { display: flex; align-items: center; gap: 8px; cursor: pointer; accent-color: #448AFF; }
      `}</style>

      <div className="cloud-view-container hide-scroll" style={{ height: '100%', paddingBottom: '20px' }}>
        
        {/* Header section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '25px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 600 }}>Weather trends</h2>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button className="dropdown-btn">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_today</span>
              Last 12 months
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>expand_more</span>
            </button>
            <button className="dropdown-btn">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list</span>
              All months
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>expand_more</span>
            </button>
          </div>
        </div>

        {/* Main Chart Container */}
        <div className="glass-card" style={{ flex: 1, padding: '25px', display: 'flex', flexDirection: 'column', minHeight: '450px' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {tabs.map(tab => (
                <button
                  key={tab.name}
                  className={`tab-btn ${activeTab === tab.name ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.name)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>
            
            {/* Toggles for Precipitation/Wind */}
            {(activeTab === 'Precipitation' || activeTab === 'Wind') && (
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '20px', overflow: 'hidden' }}>
                <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 16px', cursor: 'pointer' }}>Daily</button>
                <button style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', padding: '6px 16px', cursor: 'pointer' }}>Accumulation</button>
              </div>
            )}
          </div>

          {/* Chart Area */}
          <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
            
            {/* Y-Axis */}
            <div className="y-axis" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '13px', opacity: 0.8, paddingRight: '20px', minWidth: '60px' }}>
              {activeTab === 'Temperature' && <><span>50&deg;</span><span>40&deg;</span><span>30&deg;</span><span>20&deg;</span><span>10&deg;</span><span>0&deg;</span></>}
              {activeTab === 'Precipitation' && <><span>5 cm</span><span>4 cm</span><span>3 cm</span><span>2 cm</span><span>1 cm</span><span>0 cm</span></>}
              {activeTab === 'Humidity' && <><span>100%</span><span>80%</span><span>60%</span><span>40%</span><span>20%</span><span>0%</span></>}
              {activeTab === 'Wind' && <><span>20 km/h</span><span>15 km/h</span><span>10 km/h</span><span>5 km/h</span><span>0 km/h</span></>}
            </div>

            {/* SVG Data Area with Hover Events */}
            <div 
              ref={chartRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverData(null)}
              style={{ flex: 1, position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.2)', cursor: 'crosshair' }}
            >
              
              {/* Vertical Grid Lines */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
                 {[...Array(12)].map((_, i) => (
                    <div key={i} style={{ width: '1px', background: 'rgba(255,255,255,0.05)', height: '100%' }}></div>
                 ))}
              </div>

              {/* "Today" Marker Line */}
              <div style={{ position: 'absolute', right: '15%', top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.4)', zIndex: 10, pointerEvents: 'none' }}>
                <span style={{ position: 'absolute', top: '10px', left: '-25px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.2)' }}>Today</span>
              </div>

              {/* Dynamic Interactive Popup */}
              {hoverData && (
                <>
                  <div style={{ position: 'absolute', left: hoverData.x, top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.8)', zIndex: 15, pointerEvents: 'none' }} />
                  
                  <div style={{ 
                    position: 'absolute', 
                    left: hoverData.tooltipX, 
                    top: '35%', 
                    background: 'rgba(0,0,0,0.9)', 
                    padding: '12px 16px', 
                    borderRadius: '10px', 
                    fontSize: '12px', 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    zIndex: 20,
                    pointerEvents: 'none',
                    minWidth: '210px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}>
                    <div style={{ marginBottom: '8px', fontWeight: 600 }}>{hoverData.dateStr}</div>
                    
                    {activeTab === 'Temperature' && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><span style={{ width: '6px', height: '6px', background: '#FF5252', borderRadius: '50%' }}></span> Daily high: {hoverData.values.high}&deg;</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><span style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }}></span> Historical daily high: {hoverData.values.histHigh}&deg;</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><span style={{ width: '6px', height: '6px', background: '#448AFF', borderRadius: '50%' }}></span> Daily low: {hoverData.values.low}&deg;</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }}></span> Historical daily low: {hoverData.values.histLow}&deg;</div>
                      </>
                    )}
                    {activeTab === 'Precipitation' && (
                       <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><span style={{ width: '6px', height: '6px', background: '#00E5FF', borderRadius: '50%' }}></span> Daily precipitation: {hoverData.values.precip} cm</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }}></span> Probability (hist): {hoverData.values.prob}%</div>
                       </>
                    )}
                    {activeTab === 'Humidity' && (
                       <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><span style={{ width: '6px', height: '6px', background: '#00E5FF', borderRadius: '50%' }}></span> Daily average: {hoverData.values.avg}%</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }}></span> Historical average: {hoverData.values.histAvg}%</div>
                       </>
                    )}
                    {activeTab === 'Wind' && (
                       <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><span style={{ width: '6px', height: '6px', background: '#00E5FF', borderRadius: '50%' }}></span> Daily avg: {hoverData.values.avg} km/h {hoverData.values.dir}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }}></span> Historical average: {hoverData.values.histAvg} km/h</div>
                       </>
                    )}
                  </div>
                </>
              )}

              {/* FLATTENED SVGs */}
              <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
                
                {/* 1. TEMPERATURE CHART (Squeezed heavily between Y=120 and Y=200) */}
                {activeTab === 'Temperature' && (
                  <>
                    <path d="M0,150 Q50,160 100,120 T150,165 T200,130 T300,170 T400,155 T500,170 T600,190 T700,205 T800,165 T900,145 T1000,120 L1000,300 L0,300 Z" fill="rgba(255, 82, 82, 0.15)" />
                    <path d="M0,150 Q50,160 100,120 T150,165 T200,130 T300,170 T400,155 T500,170 T600,190 T700,205 T800,165 T900,145 T1000,120" fill="none" stroke="#FF5252" strokeWidth="2" />
                    
                    <path d="M0,180 Q50,195 100,170 T150,200 T200,180 T300,190 T400,200 T500,210 T600,225 T700,230 T800,210 T900,185 T1000,190 L1000,300 L0,300 Z" fill="rgba(68, 138, 255, 0.15)" />
                    <path d="M0,180 Q50,195 100,170 T150,200 T200,180 T300,190 T400,200 T500,210 T600,225 T700,230 T800,210 T900,185 T1000,190" fill="none" stroke="#448AFF" strokeWidth="2" />
                    
                    <path d="M850,155 Q900,135 1000,120" fill="none" stroke="#FF5252" strokeWidth="2" strokeDasharray="4,4" />
                    <path d="M850,198 Q900,185 1000,190" fill="none" stroke="#448AFF" strokeWidth="2" strokeDasharray="4,4" />
                    <path d="M0,165 Q100,145 200,165 T400,175 T600,210 T800,185 T1000,150" fill="none" stroke="white" strokeWidth="2" strokeDasharray="4,4" />
                  </>
                )}

                {/* 2. PRECIPITATION CHART (Untouched) */}
                {activeTab === 'Precipitation' && (
                  <>
                    <path d="M0,300 L0,290 L10,290 L10,300 M50,300 L50,200 L55,200 L55,300 M150,300 L150,250 L155,250 L155,300 M250,300 L250,180 L255,180 L255,300 M350,300 L350,80 L360,80 L360,300 M450,300 L450,150 L455,150 L455,300 M480,300 L480,220 L485,220 L485,300 M500,300 L500,100 L505,100 L505,300 M800,300 L800,290 L805,290 L805,300 M900,300 L900,270 L905,270 L905,300" fill="#00E5FF" />
                    <path d="M0,300 L30,300 L50,200 L80,280 L150,250 L200,300 L250,180 L300,260 L350,80 L400,280 L450,150 L480,220 L500,100 L550,290 L800,290 L850,295 L900,270 L1000,290" fill="rgba(0, 229, 255, 0.15)" stroke="#00B4D8" strokeWidth="1.5" />
                  </>
                )}

                {/* 3. HUMIDITY CHART (Flattened curves between Y=140 and Y=220) */}
                {activeTab === 'Humidity' && (
                  <>
                    <path d="M0,180 Q50,120 100,180 T200,130 T300,140 T400,150 T500,180 T600,160 T700,150 T800,180 T900,210 T1000,180 L1000,300 L0,300 Z" fill="rgba(0, 229, 255, 0.2)" />
                    <path d="M0,180 Q50,120 100,180 T200,130 T300,140 T400,150 T500,180 T600,160 T700,150 T800,180 T900,210 T1000,180" fill="none" stroke="#00E5FF" strokeWidth="2" />
                    <path d="M850,195 Q900,220 1000,180" fill="none" stroke="#00E5FF" strokeWidth="2" strokeDasharray="4,4" />
                    <path d="M0,210 Q100,190 200,160 T400,170 T600,190 T800,185 T1000,210" fill="none" stroke="white" strokeWidth="2" strokeDasharray="4,4" />
                  </>
                )}

                {/* 4. WIND CHART (Completely flattened spikes, kept between Y=170 and Y=255) */}
                {activeTab === 'Wind' && (
                  <>
                     <path d="M0,250 Q20,180 40,250 T80,210 T120,255 T150,190 T200,250 T250,170 T300,245 T350,210 T400,255 T450,180 T500,250 T550,200 T600,255 T650,220 T700,250 T750,210 T800,250 T850,245" fill="rgba(0, 229, 255, 0.1)" stroke="#448AFF" strokeWidth="1.5" />
                     <path d="M850,245 Q870,210 890,245 T920,225 T950,245 T980,220 T1000,245" fill="none" stroke="#448AFF" strokeWidth="1.5" strokeDasharray="4,4" />
                     <path d="M0,200 Q100,210 200,205 T400,225 T600,215 T800,195 T1000,185" fill="none" stroke="white" strokeWidth="2" strokeDasharray="4,4" />
                  </>
                )}
              </svg>

              {/* X-Axis Months */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', opacity: 0.8, position: 'absolute', bottom: '-25px', left: '10px', right: '10px', pointerEvents: 'none' }}>
                <span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span style={{fontWeight: 'bold', color: 'white'}}>Mar</span><span>Apr</span>
              </div>
            </div>
          </div>

          {/* Bottom Legend */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '45px', fontSize: '13px', opacity: 0.9 }}>
             {renderLegend()}
             <label className="legend-item"><input type="checkbox" defaultChecked /> <div style={{ width: '12px', height: '12px', background: 'rgba(255,255,255,0.2)' }}></div> Confidence</label>
          </div>

        </div>
      </div>
    </>
  );
}