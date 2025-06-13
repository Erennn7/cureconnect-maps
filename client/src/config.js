// Configuration for API endpoints
const config = {
  apiUrl: import.meta.env.VITE_API_URL || (
    import.meta.env.DEV 
      ? 'http://localhost:3001' 
      : 'https://cureconnect-maps-api.vercel.app'
  ),
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
};

export default config; 