/**
 * File: src/utils/predictionEngine.js
 * Function: calculateHybridTrend
 * Purpose: ML-based temperature forecasting using Weighted Linear Regression.
 */

/**
 * Calculates a trend line based on historical and forecast data.
 * @param {Array} historicalData - 30 days of data from Open-Meteo [{temp, date}, ...]
 * @param {Array} forecastData - 5 days of data from OpenWeather [{temp, date}, ...]
 * @returns {Object} { predictedPoints, slope, intercept }
 */
export const calculateHybridTrend = (historicalData, forecastData) => {
  // Combine datasets with specific weights
  // x = index (time), y = temperature
  const combinedPoints = [
    ...historicalData.map((d, i) => ({ x: i, y: d.temp, weight: 1 })),
    ...forecastData.map((d, i) => ({ 
      x: historicalData.length + i, 
      y: d.temp, 
      weight: 2 // 2x weight for forecast data
    }))
  ];

  let sumW = 0;
  let sumWX = 0;
  let sumWY = 0;
  let sumWXX = 0;
  let sumWXY = 0;

  // Weighted Linear Regression: y = mx + b
  // Calculations based on the Weighted Least Squares method
  combinedPoints.forEach((point) => {
    const { x, y, weight } = point;
    sumW += weight;
    sumWX += weight * x;
    sumWY += weight * y;
    sumWXX += weight * x * x;
    sumWXY += weight * x * y;
  });

  // Calculate Weighted Means
  const xMean = sumWX / sumW;
  const yMean = sumWY / sumW;

  // Calculate Slope (m)
  // Formula: m = Σ w(x - xMean)(y - yMean) / Σ w(x - xMean)^2
  const numerator = sumWXY - (sumWX * sumWY) / sumW;
  const denominator = sumWXX - (sumWX * sumWX) / sumW;
  
  const m = denominator !== 0 ? numerator / denominator : 0;
  
  // Calculate Intercept (b)
  // Formula: b = yMean - m * xMean
  const b = yMean - m * xMean;

  // Generate Predicted Points for the "Trend" visualization
  // We'll project for the next 7 days (including the forecast window)
  const totalLength = historicalData.length + forecastData.length;
  const predictedPoints = [];

  for (let i = historicalData.length; i < totalLength + 7; i++) {
    predictedPoints.push({
      day: i,
      temp: parseFloat((m * i + b).toFixed(2))
    });
  }

  return {
    predictedPoints,
    slope: m, // Used by Logic Engine to trigger "Rising/Falling" alerts
    intercept: b
  };
};