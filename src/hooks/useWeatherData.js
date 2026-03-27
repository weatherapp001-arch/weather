import { useState, useEffect } from 'react';
import axios from 'axios';
import { calculateHybridTrend } from '../utils/weatherEngine'; // From Tab 3
import { interpretWeather } from '../utils/weatherEngine';      // From Tab 2

const OPEN_WEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY;

export const useWeatherData = () => {
    const [weatherData, setWeatherData] = useState({
        current: JSON.parse(localStorage.getItem('cachedWeather')) || null,
        forecast: null,
        history: null,
        prediction: null,
        aiSummary: JSON.parse(localStorage.getItem('cachedAiSummary')) || null,
        loading: true,
        error: null
    });

    

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Get User Location
                navigator.geolocation.getCurrentPosition(async (position) => {
                    const { latitude, longitude } = position.coords;

                    // 2. Prepare Date range for Open-Meteo (30 days ago)
                    const end = new RegExp().toISOString().split('T')[0];
                    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0];

                    // 3. Parallel Fetching
                    const [currentRes, forecastRes, historyRes] = await Promise.all([
                        axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPEN_WEATHER_KEY}&units=metric`),
                        axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${OPEN_WEATHER_KEY}&units=metric`),
                        axios.get(`https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${start}&end_date=${end}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`)
                    ]);

                    // 4. Run your Logic Engines (Tab 2 & 3)
                    const prediction = calculateHybridTrend(
                        historyRes.data.daily, 
                        forecastRes.data.list
                    );
                    
                    const aiSummary = interpretWeather(
                        currentRes.data, 
                        prediction
                    );

                    setWeatherData({
                        current: currentRes.data,
                        forecast: forecastRes.data.list,
                        history: historyRes.data.daily,
                        prediction: prediction,
                        aiSummary: aiSummary,
                        loading: false,
                        error: null
                    });
                    // Persistence Logic: Saving successful fetch to local storage
                      localStorage.setItem('cachedWeather', JSON.stringify(currentRes.data));
                      localStorage.setItem('cachedAiSummary', JSON.stringify(aiSummary));
                      localStorage.setItem('lastSavedAt', new Date().toISOString());
                }, (geoError) => {
                    setWeatherData(prev => ({ 
                        ...prev, 
                        loading: false, 
                        error: "Location access denied." 
                    }));
                });

            } catch (err) {
                setWeatherData(prev => ({ 
                    ...prev, 
                    loading: false, 
                    error: "Failed to fetch weather data." 
                }));
            }
        };

        fetchData();
    }, []);

    return weatherData;
};