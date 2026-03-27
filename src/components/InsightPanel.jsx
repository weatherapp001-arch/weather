// File: src/components/InsightPanel.jsx
// Element: InsightPanel Component

import React, { useState, useEffect } from 'react';

const InsightPanel = ({ aiSummary, lat, lon, apiKey, language = 'en' }) => {
  const [aqiData, setAqiData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Translation mapping for UI labels
  const labels = {
    en: {
      title: "AI Weather Insights",
      aqiTitle: "Air Quality Index",
      health: "Health Recommendations",
      tips: "Safety Tips",
      loading: "Analyzing atmosphere...",
      status: ["Good", "Fair", "Moderate", "Poor", "Very Poor"]
    },
    hi: {
      title: "AI मौसम अंतर्दृष्टि",
      aqiTitle: "वायु गुणवत्ता सूचकांक",
      health: "स्वास्थ्य अनुशंसाएँ",
      tips: "सुरक्षा युक्तियाँ",
      loading: "वातावरण का विश्लेषण...",
      status: ["अच्छा", "ठीक", "मध्यम", "खराब", "बहुत खराब"]
    }
  };

  const t = labels[language] || labels.en;

  useEffect(() => {
    const fetchAQI = async () => {
      if (!lat || !lon) return;
      
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
        );
        const data = await response.json();
        // Line 41: Setting the main pollution object from API response
        setAqiData(data.list[0]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching AQI:", error);
        setLoading(false);
      }
    };

    fetchAQI();
  }, [lat, lon, apiKey]);

  const getAqiTheme = (index) => {
    const themes = [
      { color: '#4caf50', label: t.status[0] }, // Good
      { color: '#8bc34a', label: t.status[1] }, // Fair
      { color: '#ffeb3b', label: t.status[2] }, // Moderate
      { color: '#ff9800', label: t.status[3] }, // Poor
      { color: '#f44336', label: t.status[4] }  // Very Poor
    ];
    return themes[index - 1] || themes[0];
  };

  if (loading && !aiSummary) {
    return <div className="p-4 text-center">{t.loading}</div>;
  }

  const currentTheme = aqiData ? getAqiTheme(aqiData.main.aqi) : null;

  return (
    <div className="insight-panel bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      {/* Header Section */}
      <div className="flex items-center mb-4">
        <span className="material-icons text-blue-500 mr-2">psychology</span>
        <h2 className="text-xl font-semibold text-gray-800">{t.title}</h2>
      </div>

      {/* AI Summary Text */}
      <div className="ai-content mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
        <p className="text-gray-700 leading-relaxed italic">
          "{aiSummary || t.loading}"
        </p>
      </div>

      {/* AQI Display Section */}
      {aqiData && (
        <div className="aqi-section grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="aqi-card p-4 border border-gray-100 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wider">{t.aqiTitle}</p>
              <h3 className="text-2xl font-bold" style={{ color: currentTheme.color }}>
                {currentTheme.label}
              </h3>
            </div>
            <div 
              className="aqi-badge w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: currentTheme.color }}
            >
              {aqiData.main.aqi}
            </div>
          </div>

          <div className="details-card flex flex-col gap-3">
            <div className="flex items-start">
              <span className="material-icons text-green-500 text-sm mr-2">health_and_safety</span>
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase">{t.health}</p>
                <p className="text-sm text-gray-500">
                  {aqiData.main.aqi > 3 ? "Limit outdoor activities." : "Safe for outdoor exercise."}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <span className="material-icons text-amber-500 text-sm mr-2">tips_and_updates</span>
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase">{t.tips}</p>
                <p className="text-sm text-gray-500">
                  {aqiData.main.aqi > 2 ? "Consider wearing a mask." : "Enjoy the fresh air!"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightPanel;