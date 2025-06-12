import React from 'react';

const HospitalList = ({ hospitals, userLocation, selectedHospital, onHospitalSelect, facilityType }) => {
  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    const d = R * c; // Distance in km
    return d.toFixed(1);
  };
  
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Generate facility type badge
  const getBadge = (types, facilityType) => {
    if (facilityType === 'medicalStore') {
      if (types && types.includes('pharmacy')) {
        return <span className="pharmacy-badge">Pharmacy</span>;
      } else if (types && types.includes('drugstore')) {
        return <span className="drugstore-badge">Drugstore</span>;
      } else {
        return <span className="medical-store-badge">Medical Store</span>;
      }
    } else {
      // Original hospital badges
    if (types && types.includes('hospital')) {
      return <span className="hospital-badge">Hospital</span>;
    } else if (types && types.includes('doctor')) {
      return <span className="doctor-badge">Doctor</span>;
    } else {
      return <span className="medical-badge">Medical</span>;
    }
    }
  };

  // Get the list title based on facility type
  const getListTitle = () => {
    return facilityType === 'medicalStore' ? 'Nearest Medical Stores' : 'Nearest Hospitals';
  };

  // Get the icon for distance based on facility type
  const getDistanceIcon = () => {
    return facilityType === 'medicalStore' ? '📍' : '📍';
  };

  return (
    <div className="hospital-list">
      <h2>{getListTitle()}</h2>
      {hospitals.length === 0 ? (
        <div className="no-results">
          <i className="no-results-icon">📍</i>
          <p>No {facilityType === 'medicalStore' ? 'medical stores' : 'hospitals'} found nearby.</p>
          <p className="no-results-subtitle">Try expanding your search area or checking your location settings.</p>
        </div>
      ) : (
        <ul>
          {hospitals.map((facility) => {
            const distance = userLocation ?
              calculateDistance(
                userLocation.lat, 
                userLocation.lng,
                facility.geometry.location.lat,
                facility.geometry.location.lng
              ) : 'N/A';
              
            const isSelected = selectedHospital && selectedHospital.place_id === facility.place_id;
              
            return (
              <li 
                key={facility.place_id} 
                className={`hospital-item ${isSelected ? 'selected' : ''} ${facilityType === 'medicalStore' ? 'medical-store-item' : 'hospital-item'}`}
                onClick={() => onHospitalSelect(facility)}
              >
                <h3>{facility.name}</h3>
                <p className="hospital-address">{facility.vicinity}</p>
                <div className="hospital-details">
                  <span className="hospital-distance">
                    <i className="distance-icon">{getDistanceIcon()}</i> {distance} km away
                  </span>
                  <span className="hospital-rating">
                    {facility.rating ? (
                      <>
                        <i className="rating-icon">★</i> {facility.rating}
                      </>
                    ) : 'Rating: N/A'}
                  </span>
                </div>
                {facility.types && getBadge(facility.types, facilityType)}
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${facility.geometry.location.lat},${facility.geometry.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="directions-button"
                >
                  Get Directions
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default HospitalList;