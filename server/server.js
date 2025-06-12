const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

// Load environment variables from root .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5174', 'https://cureconnect-maps.vercel.app', process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null].filter(Boolean),
  credentials: true
}));
app.use(express.json());

console.log('Environment variables:', {
    API_KEY: process.env.GOOGLE_MAPS_API_KEY ? 'Set (length: ' + process.env.GOOGLE_MAPS_API_KEY.length + ')' : 'Missing',
    PORT: process.env.PORT
  });

// Endpoint to fetch nearby hospitals
app.get('/api/hospitals', async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }
      
      const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
      
      if (!API_KEY) {
        return res.status(500).json({ error: 'Google Maps API key is not configured' });
      }
      
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
        {
          params: {
            location: `${lat},${lng}`,
            radius: 5000, // 5km radius
            type: 'hospital',
            key: API_KEY
          }
        }
      );
      
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching nearby hospitals:', error.message);
      res.status(500).json({ error: 'Failed to fetch nearby hospitals' });
    }
  });

// Endpoint to fetch nearby medical stores/pharmacies
app.get('/api/medical-stores', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ error: 'Google Maps API key is not configured' });
    }
    
    // First try to find pharmacies
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
      {
        params: {
          location: `${lat},${lng}`,
          radius: 5000, // 5km radius
          type: 'pharmacy',
          key: API_KEY
        }
      }
    );
    
    // If no pharmacies found, try drugstores
    if (!response.data.results || response.data.results.length === 0) {
      const drugstoreResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
        {
          params: {
            location: `${lat},${lng}`,
            radius: 5000, // 5km radius
            keyword: 'drugstore OR medical store',
            key: API_KEY
          }
        }
      );
      
      res.json(drugstoreResponse.data);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Error fetching nearby medical stores:', error.message);
    res.status(500).json({ error: 'Failed to fetch nearby medical stores' });
  }
});

// Endpoint for geocoding an address
app.get('/api/geocode-address', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ error: 'Google Maps API key is not configured' });
    }
    
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address: address,
          key: API_KEY
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error geocoding address:', error.message);
    res.status(500).json({ error: 'Failed to geocode address' });
  }
});

// Endpoint for reverse geocoding
app.get('/api/geocode', async (req, res) => {
  try {
    const { latlng } = req.query;
    
    if (!latlng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ error: 'Google Maps API key is not configured' });
    }
    
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          latlng: latlng,
          key: API_KEY
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error reverse geocoding:', error.message);
    res.status(500).json({ error: 'Failed to perform reverse geocoding' });
  }
});

// IP-based geolocation endpoint as fallback
app.get('/api/ip-location', async (req, res) => {
  try {
    // Try ipapi.co first
    try {
      const response = await axios.get('https://ipapi.co/json/', { 
        timeout: 5000 // 5 second timeout
      });
      if (response.data && response.data.latitude && response.data.longitude) {
        return res.json(response.data);
      }
    } catch (ipApiError) {
      console.log('Primary IP geolocation service failed:', ipApiError.message);
      // Continue to fallback if ipapi.co fails
    }

    // Try alternative service if first one fails
    try {
      const response = await axios.get('https://ipinfo.io/json', {
        timeout: 5000, // 5 second timeout
        params: {
          token: process.env.IPINFO_TOKEN || '' // Use token if available, ok to try without token (rate limited)
        }
      });
      
      if (response.data && response.data.loc) {
        // ipinfo returns location as "lat,lng" string
        const [latitude, longitude] = response.data.loc.split(',').map(coord => parseFloat(coord));
        return res.json({
          ...response.data,
          latitude,
          longitude
        });
      }
    } catch (ipInfoError) {
      console.log('Secondary IP geolocation service failed:', ipInfoError.message);
      // Both services failed
    }
    
    // Last resort - use a default location (e.g., center of the country or major city)
    // This ensures the app doesn't completely break if geolocation fails
    return res.json({
      latitude: 37.0902, // Default to somewhere in USA (center point)
      longitude: -95.7129,
      country: 'United States',
      city: 'Default Location',
      ip: '0.0.0.0',
      message: 'Using default location - IP geolocation failed'
    });
    
  } catch (error) {
    console.error('Error fetching IP location:', error.message);
    res.status(500).json({ 
      error: 'Failed to determine location from IP',
      latitude: 37.0902, // Provide fallback coordinates even in error response
      longitude: -95.7129
    });
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API key status: ${process.env.GOOGLE_MAPS_API_KEY ? 'Configured' : 'Missing'}`);
  });
}

// Export for Vercel
module.exports = app;