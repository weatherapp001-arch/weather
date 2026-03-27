// Example trigger inside your fetching function
const fetchWeatherData = async () => {
  try {
    // ... fetching logic
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('API_UNAVAILABLE');
    
    // On success (e.g., when manual refresh occurs or app first loads)
    notifySuccess("Weather updated successfully!");
  } catch (error) {
    // Line 112: Error Toast for API/Geolocation failure
    notifyError("Weather API failed to sync. Please check connection.");
  }
};

const getGeoLocation = () => {
  if (!navigator.geolocation) {
    notifyError("Geolocation is not supported by your browser.");
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (pos) => { /* success */ },
    () => notifyError("Location access denied. Using default city.")
  );
};