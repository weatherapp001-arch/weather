// src/services/weatherService.js

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5/';

/**
 * Fetches current weather data for a specific city.
 * @param {string} city - The name of the city.
 */
export const fetchCurrentWeather = async (city) => {
    try {
        const response = await fetch(
            `${BASE_URL}weather?q=${city}&units=metric&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to fetch weather data:", error);
        return null;
    }
};
