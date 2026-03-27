/**
 * Weather Logic Engine (Pseudo-AI)
 * File: src/utils/weatherInterpreter.js
 * Purpose: Generates NLP summaries based on ML trends and live data.
 */

const translations = {
  en: {
    header: "AI WEATHER ANALYSIS",
    rising: "A sharp thermal increase is projected based on current regression trends.",
    falling: "Data indicates a significant cooling trajectory in the coming hours.",
    stable: "Atmospheric conditions remain within a stable equilibrium.",
    heat_alert: "Expect a sharp rise in heat; localized heatwave conditions possible.",
    cold_alert: "Thermal drop detected; prepare for significantly cooler conditions.",
    rain_alert: "Hydrological sensors indicate high probability of precipitation.",
    clear_outlook: "High-pressure systems dominate, ensuring clear sky conditions.",
    precaution: "Recommendation: Adjust outdoor activities according to thermal shifts.",
  },
  hi: {
    header: "AI मौसम विश्लेषण",
    rising: "वर्तमान रिग्रेशन रुझानों के आधार पर तापमान में तीव्र वृद्धि का अनुमान है।",
    falling: "आंकड़े आने वाले घंटों में महत्वपूर्ण शीतलन प्रक्षेपवक्र (Cooling Trajectory) का संकेत देते हैं।",
    stable: "वायुमंडलीय स्थितियां एक स्थिर संतुलन में बनी हुई हैं।",
    heat_alert: "गर्मी में भारी वृद्धि की उम्मीद करें; स्थानीय लू की स्थिति संभव है।",
    cold_alert: "तापमान में गिरावट दर्ज की गई; काफी ठंडी स्थितियों के लिए तैयार रहें।",
    rain_alert: "जल विज्ञान सेंसर वर्षा की उच्च संभावना का संकेत देते हैं।",
    clear_outlook: "उच्च दबाव प्रणालियां हावी हैं, जिससे आसमान साफ रहेगा।",
    precaution: "सुझाव: थर्मल बदलाव के अनुसार बाहरी गतिविधियों को समायोजित करें।",
  }
};

/**
 * Interprets weather data to produce a natural language summary.
 * @param {Object} currentData - Current weather object (temp, humidity, etc.)
 * @param {Array} forecastData - Array of upcoming forecast blocks
 * @param {number} slope - The 'm' value from Linear Regression (Trend)
 * @param {string} lang - Language code ('en' or 'hi')
 */
export const interpretWeather = (currentData, forecastData, slope, lang = 'en') => {
  const t = translations[lang] || translations['en'];
  const { temp, weather } = currentData;
  const isRainy = forecastData.some(f => f.weather[0].main.includes('Rain'));
  
  let trendMsg = "";
  let alertMsg = "";
  let outlookMsg = "";

  // 1. Trend Logic based on ML Slope
  if (slope > 0.5) {
    trendMsg = t.rising;
  } else if (slope < -0.5) {
    trendMsg = t.falling;
  } else {
    trendMsg = t.stable;
  }

  // 2. Threshold Alerts
  if (temp > 30 && slope > 0.3) {
    alertMsg = t.heat_alert;
  } else if (temp < 15 && slope < -0.3) {
    alertMsg = t.cold_alert;
  }

  // 3. Forecast Interpretation
  if (isRainy) {
    outlookMsg = t.rain_alert;
  } else if (weather[0].main === "Clear") {
    outlookMsg = t.clear_outlook;
  }

  // Constructing the "AI" response string
  return `
    [${t.header}]
    ---
    Status: ${trendMsg}
    ${alertMsg ? `Alert: ${alertMsg}` : ''}
    Outlook: ${outlookMsg}
    Note: ${t.precaution}
  `.trim();
};