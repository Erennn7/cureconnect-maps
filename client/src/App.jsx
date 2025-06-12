import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import HospitalMap from './components/HospitalMap';
import HospitalList from './components/HospitalList';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [medicalStores, setMedicalStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [locationMethod, setLocationMethod] = useState('');
  const [showMedicalStores, setShowMedicalStores] = useState(false);
  
  // Fetch hospitals based on location
  const fetchNearbyHospitals = useCallback(async (lat, lng) => {
    try {
      setLoading(true);
      // In development, this uses the Vite proxy configured in vite.config.js
      const response = await fetch(`/api/hospitals?lat=${lat}&lng=${lng}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch nearby hospitals");
      }
      
      const data = await response.json();
      
      if (data.status === "REQUEST_DENIED") {
        throw new Error(`Google API error: ${data.error_message}`);
      }
      
      if (!data.results || data.results.length === 0) {
        setHospitals([]);
        setLoading(false);
        return;
      }
      
      setHospitals(data.results.slice(0, 10)); // Increased to top 10 results
      setLoading(false);
    } catch (error) {
      console.error("Hospital fetch error:", error);
      setError(error.message || "Failed to fetch nearby hospitals.");
      setLoading(false);
    }
  }, []);

  // Fetch medical stores based on location
  const fetchNearbyMedicalStores = useCallback(async (lat, lng) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/medical-stores?lat=${lat}&lng=${lng}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch nearby medical stores");
      }
      
      const data = await response.json();
      
      if (data.status === "REQUEST_DENIED") {
        throw new Error(`Google API error: ${data.error_message}`);
      }
      
      if (!data.results || data.results.length === 0) {
        setMedicalStores([]);
        setLoading(false);
        return;
      }
      
      setMedicalStores(data.results.slice(0, 10)); // Top 10 results
      setLoading(false);
    } catch (error) {
      console.error("Medical stores fetch error:", error);
      setError(error.message || "Failed to fetch nearby medical stores.");
      setLoading(false);
    }
  }, []);

  // Function to get precise location using Google Maps Geocoding API
  const refinePreciseLocation = useCallback(async (latitude, longitude) => {
    try {
      // This requires setting up a proxy endpoint on your server that forwards to Google's geocoding API
      const response = await fetch(`/api/geocode?latlng=${latitude},${longitude}`);
      
      if (!response.ok) {
        throw new Error('Failed to refine location');
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        // Get the most precise result (usually the first one)
        const location = data.results[0].geometry.location;
        return { 
          lat: location.lat, 
          lng: location.lng, 
          accuracy: 'high',
          method: 'geocode-api'
        };
      }
      
      return { lat: latitude, lng: longitude, accuracy: 'medium', method: 'geolocation-api' };
    } catch (error) {
      console.warn('Location refinement failed:', error);
      return { lat: latitude, lng: longitude, accuracy: 'medium', method: 'geolocation-api' };
    }
  }, []);

  // Get user location with multiple strategies
  const getUserLocation = useCallback(async () => {
    setLocationLoading(true);
    
    // Check if Google Maps API key is available
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      setError("Google Maps API key is missing. Please check your environment variables.");
      setLocationLoading(false);
      setLoading(false);
      return;
    }
    
    const highAccuracyOptions = { 
      enableHighAccuracy: true,
      timeout: 15000,  // Extended timeout
      maximumAge: 0    // Always get fresh position
    };
    
    const standardOptions = {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000 // 1 minute cache
    };
    
    try {
      // Try to get high accuracy location first
      if (navigator.geolocation) {
        const getHighAccuracyPosition = new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, highAccuracyOptions);
        });
        
        // Set a timeout in case getting high accuracy takes too long
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('High accuracy location request timed out')), 15000);
        });
        
        try {
          // Race between getting high accuracy position and timeout
          const position = await Promise.race([getHighAccuracyPosition, timeoutPromise]);
          
          const { latitude, longitude, accuracy } = position.coords;
          console.log("High accuracy location obtained:", latitude, longitude, "Accuracy:", accuracy, "meters");
          
          // Refine location using Google's geocoding for better accuracy
          const refinedLocation = await refinePreciseLocation(latitude, longitude);
          
          setUserLocation({ 
            lat: refinedLocation.lat, 
            lng: refinedLocation.lng 
          });
          setLocationAccuracy(refinedLocation.accuracy);
          setLocationMethod(refinedLocation.method);
          
          await fetchNearbyHospitals(refinedLocation.lat, refinedLocation.lng);
          await fetchNearbyMedicalStores(refinedLocation.lat, refinedLocation.lng);
          setLocationLoading(false);
          return; // Success, exit the function
        } catch (highAccuracyError) {
          console.log("High accuracy location failed:", highAccuracyError);
          // Continue to try standard accuracy
        }
        
        // Try standard accuracy as fallback
        try {
          console.log("Falling back to standard accuracy geolocation...");
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, standardOptions);
          });
          
          const { latitude, longitude, accuracy } = position.coords;
          console.log("Standard accuracy location obtained:", latitude, longitude, "Accuracy:", accuracy, "meters");
          
          setUserLocation({ 
            lat: latitude, 
            lng: longitude 
          });
          setLocationAccuracy('medium');
          setLocationMethod('geolocation-standard');
          
          await fetchNearbyHospitals(latitude, longitude);
          await fetchNearbyMedicalStores(latitude, longitude);
          setLocationLoading(false);
          return; // Success, exit the function
        } catch (standardAccuracyError) {
          console.error("Standard geolocation error:", standardAccuracyError);
          // Continue to IP fallback
        }
      } else {
        throw new Error("Geolocation is not supported by your browser.");
      }
      
      // If we reach here, both high and standard accuracy failed
      throw new Error("Browser geolocation failed or was denied");
      
    } catch (geoError) {
      console.error("All geolocation attempts failed:", geoError);
      
      // Fallback to IP-based geolocation
      try {
        console.log("Falling back to IP-based geolocation...");
        const response = await fetch('/api/ip-location');
        
        if (!response.ok) {
          throw new Error("IP location service failed");
        }
        
        const ipLocation = await response.json();
        
        if (ipLocation && ipLocation.latitude && ipLocation.longitude) {
          setUserLocation({ 
            lat: ipLocation.latitude, 
            lng: ipLocation.longitude 
          });
          
          // Set accuracy based on response
          if (ipLocation.message && ipLocation.message.includes('default location')) {
            setLocationAccuracy('low');
            setLocationMethod('default-fallback');
            // Show a more specific error without blocking the app
            setError("Could not determine your precise location. Using a default location. Please allow location access or enter your location manually for accurate results.");
          } else {
            setLocationAccuracy('low');
            setLocationMethod('ip-based');
          }
          
          await fetchNearbyHospitals(ipLocation.latitude, ipLocation.longitude);
          await fetchNearbyMedicalStores(ipLocation.latitude, ipLocation.longitude);
        } else {
          throw new Error("Could not determine location from IP");
        }
      } catch (ipError) {
        console.error("IP geolocation error:", ipError);
        setError("Unable to determine your location. Please allow location access or enter your location manually.");
      } finally {
        setLocationLoading(false);
      }
    }
  }, [fetchNearbyHospitals, fetchNearbyMedicalStores, refinePreciseLocation]);

  // Request high accuracy location specifically 
  const requestHighAccuracyLocation = useCallback(async () => {
    setError(null);
    setLocationLoading(true);
    
    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser.");
      }
      
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { 
            enableHighAccuracy: true,
            timeout: 30000, // 30 seconds - longer timeout for higher accuracy
            maximumAge: 0 
          }
        );
      });
      
      const { latitude, longitude, accuracy } = position.coords;
      console.log("Precise location obtained:", latitude, longitude, "Accuracy:", accuracy, "meters");
      
      setUserLocation({ 
        lat: latitude, 
        lng: longitude 
      });
      
      // Even without refinement, show the best accuracy we can get
      if (accuracy < 100) {
        setLocationAccuracy('high');
        setLocationMethod('precise-geolocation');
      } else {
        setLocationAccuracy('medium');
        setLocationMethod('geolocation-api');
      }
      
      await fetchNearbyHospitals(latitude, longitude);
      await fetchNearbyMedicalStores(latitude, longitude);
      
    } catch (error) {
      console.error("High accuracy location error:", error);
      setError("Could not get precise location. Please check your location settings and try again.");
    } finally {
      setLocationLoading(false);
    }
  }, [fetchNearbyHospitals, fetchNearbyMedicalStores]);

  // Update location manually
  const updateLocationManually = useCallback(async (address) => {
    try {
      setLocationLoading(true);
      
      // Geocode the address to coordinates
      const response = await fetch(`/api/geocode-address?address=${encodeURIComponent(address)}`);
      
      if (!response.ok) {
        throw new Error('Failed to geocode address');
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        
        setUserLocation({ 
          lat: location.lat, 
          lng: location.lng 
        });
        setLocationAccuracy('high');
        setLocationMethod('manual-input');
        
        await fetchNearbyHospitals(location.lat, location.lng);
        await fetchNearbyMedicalStores(location.lat, location.lng);
      } else {
        throw new Error('Could not find location from address');
      }
    } catch (error) {
      console.error("Manual location update error:", error);
      setError("Could not find the location you entered. Please try again.");
    } finally {
      setLocationLoading(false);
    }
  }, [fetchNearbyHospitals, fetchNearbyMedicalStores]);

  // Refresh user's location
  const refreshLocation = () => {
    setError(null);
    getUserLocation();
  };

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  const handleHospitalSelect = (hospital) => {
    setSelectedHospital(hospital);
  };

  const toggleFacilityType = () => {
    setShowMedicalStores(!showMedicalStores);
  };

  // Location accuracy banner message
  const getLocationAccuracyMessage = () => {
    if (!locationAccuracy) return null;
    
    switch (locationAccuracy) {
      case 'high':
        return 'Your location is highly accurate';
      case 'medium':
        return 'Your location is moderately accurate';
      case 'low':
        return locationMethod === 'default-fallback' 
          ? 'Using approximate location - please update manually for accuracy' 
          : 'Your location may not be precise';
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Nearby Hospitals</h1>
        {locationAccuracy && !locationLoading && (
          <div className={`location-accuracy ${locationAccuracy}`}>
            {getLocationAccuracyMessage()}
          </div>
        )}
      </header>
      
      {locationMethod === 'default-fallback' && !locationLoading && (
        <div className="app-warning-banner">
          <span className="warning-icon">⚠️</span>
          <span>Using an approximate location. For accurate results, please update your location manually below.</span>
        </div>
      )}
      
      {locationLoading || loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="error-container">
          <div className="error-message">{error}</div>
          <div className="location-options">
            <button className="refresh-location-button" onClick={refreshLocation}>
              <span className="refresh-icon">↻</span> Retry with Location Services
            </button>
            <button className="high-accuracy-button" onClick={requestHighAccuracyLocation}>
              <span className="pin-icon">📍</span> Get High Accuracy Location
            </button>
          </div>
          <div className="location-manual-entry">
            <p>Or enter your location manually:</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const address = e.target.elements.address.value;
              if (address) updateLocationManually(address);
            }}>
              <input 
                type="text" 
                name="address" 
                placeholder="Enter address, city, or postal code"
                className="location-input"
              />
              <button type="submit" className="submit-location-button">
                Search
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="main-content">
          <div className="sidebar">
            <div className="location-controls">
              <div className="location-buttons">
                <button className="refresh-location-button" onClick={refreshLocation}>
                  <span className="refresh-icon">↻</span> Refresh Location
                </button>
                <button className="high-accuracy-button" onClick={requestHighAccuracyLocation}>
                  <span className="pin-icon">📍</span> Get Precise Location
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const address = e.target.elements.address.value;
                if (address) updateLocationManually(address);
              }} className="manual-location-form">
                <input 
                  type="text" 
                  name="address" 
                  placeholder="Search different location"
                  className="location-input"
                />
                <button type="submit" className="mini-submit-button">
                  Go
                </button>
              </form>
              <button 
                className={`toggle-facility-button ${showMedicalStores ? 'showing-medical-stores' : 'showing-hospitals'}`} 
                onClick={toggleFacilityType}
              >
                {showMedicalStores ? 'Show Hospitals' : 'Show Medical Stores'}
              </button>
            </div>
            {locationMethod === 'default-fallback' && (
              <div className="default-location-warning">
                <span className="warning-icon">⚠️</span>
                <span>Results are based on an approximate location. Please update your location for accurate results.</span>
              </div>
            )}
            <HospitalList 
              hospitals={showMedicalStores ? medicalStores : hospitals} 
              userLocation={userLocation} 
              selectedHospital={selectedHospital}
              onHospitalSelect={handleHospitalSelect}
              facilityType={showMedicalStores ? 'medicalStore' : 'hospital'}
            />
          </div>
          <div className="map-section">
            <HospitalMap 
              userLocation={userLocation} 
              hospitals={hospitals}
              medicalStores={medicalStores}
              showMedicalStores={showMedicalStores}
              selectedHospital={selectedHospital}
              onLocationUpdate={(locationData) => {
                // Set location with correct coordinates
                setUserLocation({
                  lat: locationData.lat,
                  lng: locationData.lng
                });
                
                // If the map passed accuracy information
                if (locationData.accuracy) {
                  setLocationAccuracy(locationData.accuracy);
                  setLocationMethod(locationData.method || 'map-selection');
                } else {
                  // Default for backward compatibility
                  setLocationAccuracy('high');
                  setLocationMethod('manual-map-selection');
                }
                
                // Clear any errors
                setError(null);
                
                // Fetch data for the new location
                fetchNearbyHospitals(locationData.lat, locationData.lng);
                fetchNearbyMedicalStores(locationData.lat, locationData.lng);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;