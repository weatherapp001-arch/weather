import React from 'react';

/**
 * WeatherCharts Component
 * Line 6: Functional component for rendering SVG weather trends
 * Props: historicalData, forecastData, mlPrediction (Arrays of {x, y} or {time, temp})
 */
const WeatherCharts = ({ historicalData = [], forecastData = [], mlPrediction = [] }) => {
  const width = 800;
  const height = 400;
  const padding = 50;

  // Combine all data to find min/max for scaling
  const allData = [...historicalData, ...forecastData, ...mlPrediction];
  const maxY = Math.max(...allData.map(d => d.temp), 0) + 5;
  const minY = Math.min(...allData.map(d => d.temp), 0) - 5;
  const totalPoints = historicalData.length + forecastData.length;

  // Scaling helper functions
  const getX = (index) => (index * (width - 2 * padding)) / (totalPoints - 1) + padding;
  const getY = (temp) => height - padding - ((temp - minY) * (height - 2 * padding)) / (maxY - minY);

  // Generate point strings for <polyline />
  const historicalPoints = historicalData
    .map((d, i) => `${getX(i)},${getY(d.temp)}`)
    .join(' ');

  const forecastPoints = forecastData
    .map((d, i) => `${getX(historicalData.length + i)},${getY(d.temp)}`)
    .join(' ');

  const mlPoints = mlPrediction
    .map((d, i) => `${getX(historicalData.length + i)},${getY(d.temp)}`)
    .join(' ');

  return (
    <div className="w-full p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
      >
        {/* SVG Definitions for Glow Effect */}
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* X and Y Axis */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

        {/* Y-Axis Labels (Min/Max) */}
        <text x={padding - 10} y={getY(maxY)} textAnchor="end" fill="white" fontSize="12" className="opacity-70">{Math.round(maxY)}°C</text>
        <text x={padding - 10} y={getY(minY)} textAnchor="end" fill="white" fontSize="12" className="opacity-70">{Math.round(minY)}°C</text>

        {/* Historical Data (Solid Blue) */}
        <polyline
          points={historicalPoints}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Forecast Data (Solid Orange) */}
        <polyline
          points={forecastPoints}
          fill="none"
          stroke="#f97316"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ML Prediction (Dotted, Glowing) */}
        <polyline
          points={mlPoints}
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeDasharray="8,4"
          strokeLinecap="round"
          filter="url(#glow)"
          className="animate-pulse"
        />

        {/* Legend */}
        <g transform={`translate(${width - 150}, ${padding})`}>
          <rect width="140" height="70" rx="8" fill="rgba(0,0,0,0.2)" />
          <line x1="10" y1="20" x2="30" y2="20" stroke="#3b82f6" strokeWidth="3" />
          <text x="40" y="25" fill="white" fontSize="12">Historical</text>
          
          <line x1="10" y1="40" x2="30" y2="40" stroke="#f97316" strokeWidth="3" />
          <text x="40" y="45" fill="white" fontSize="12">Forecast</text>

          <line x1="10" y1="60" x2="30" y2="60" stroke="#10b981" strokeWidth="3" strokeDasharray="4,2" />
          <text x="40" y="65" fill="white" fontSize="12">ML Prediction</text>
        </g>
      </svg>
    </div>
  );
};

export default WeatherCharts;