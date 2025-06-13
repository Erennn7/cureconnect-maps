const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

// Load environment variables from root .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5174', 
    'https://cureconnect-maps.vercel.app',
    'https://cureconnect-maps-client.vercel.app'
  ],
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
          radius: 5000,
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

// Endpoint to fetch nearby medical stores
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
    
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
      {
        params: {
          location: `${lat},${lng}`,
          radius: 5000,
          type: 'pharmacy',
          key: API_KEY
        }
      }
    );
    
    res.json(response.data);
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
    const response = await axios.get('https://ipapi.co/json/', { 
      timeout: 5000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching IP location:', error.message);
    res.status(500).json({ 
      error: 'Failed to determine location from IP',
      latitude: 37.0902,
      longitude: -95.7129
    });
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;