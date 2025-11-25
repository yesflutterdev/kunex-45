const https = require('https');
const { URL } = require('url');

const EARTH_RADIUS_KM = 6371;
const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const MAX_DESTINATIONS_PER_REQUEST = 25;

/**
 * Calculate distances between user location and business locations using Google Maps Distance Matrix API
 * @param {number} userLat - User's latitude
 * @param {number} userLng - User's longitude
 * @param {Array<{lat: number, lng: number}>} businessLocations - Array of business locations
 * @returns {Promise<Array<number>|null>} Array of distances in kilometers, or null if API fails
 */
async function calculateDistancesWithGoogleMaps(userLat, userLng, businessLocations) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  if (!businessLocations?.length) {
    return [];
  }

  try {
    const destinations = businessLocations
      .map(loc => `${loc.lat},${loc.lng}`)
      .join('|');

    const url = new URL(GOOGLE_MAPS_API_URL);
    url.searchParams.append('origins', `${userLat},${userLng}`);
    url.searchParams.append('destinations', destinations);
    url.searchParams.append('key', apiKey);
    url.searchParams.append('units', 'metric');

    const response = await makeHttpRequest(url.toString());

    if (response.status === 'OK' && response.rows?.[0]) {
      return response.rows[0].elements.map((element, index) => {
        if (element.status === 'OK') {
          return element.distance.value / 1000;
        }
        return calculateHaversineDistance(
          userLat,
          userLng,
          businessLocations[index].lat,
          businessLocations[index].lng
        );
      });
    }

    return null;
  } catch (error) {
    console.error('Google Maps Distance Matrix API error:', error.message);
    return null;
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate single distance between user and business using Google Maps API
 * @param {number} userLat - User's latitude
 * @param {number} userLng - User's longitude
 * @param {number} businessLat - Business latitude
 * @param {number} businessLng - Business longitude
 * @returns {Promise<number>} Distance in kilometers
 */
async function calculateDistanceWithGoogleMaps(userLat, userLng, businessLat, businessLng) {
  const distances = await calculateDistancesWithGoogleMaps(userLat, userLng, [
    { lat: businessLat, lng: businessLng }
  ]);
  
  return distances?.[0] ?? calculateHaversineDistance(userLat, userLng, businessLat, businessLng);
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    }).on('error', reject);
  });
}

module.exports = {
  calculateDistancesWithGoogleMaps,
  calculateDistanceWithGoogleMaps,
  calculateHaversineDistance
};
