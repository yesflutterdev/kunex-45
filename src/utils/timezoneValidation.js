function isValidIANATimezone(timezone) {
  if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
    return false;
  }
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const now = new Date();
    formatter.formatToParts(now);
    return true;
  } catch (error) {
    return false;
  }
}

function validateTimezone(timezone, defaultTimezone = 'UTC') {
  if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
    return defaultTimezone;
  }
  
  const trimmed = timezone.trim();
  
  if (isValidIANATimezone(trimmed)) {
    return trimmed;
  }
  
  return defaultTimezone;
}

function getTimezoneFromCoordinates(longitude, latitude) {
  if (typeof longitude !== 'number' || typeof latitude !== 'number') {
    return 'UTC';
  }
  
  if (isNaN(longitude) || isNaN(latitude)) {
    return 'UTC';
  }
  
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    return 'UTC';
  }
  
  const timezoneMap = {
    'America/New_York': { minLng: -85, maxLng: -66, minLat: 24, maxLat: 50 },
    'America/Chicago': { minLng: -102, maxLng: -85, minLat: 25, maxLat: 50 },
    'America/Denver': { minLng: -115, maxLng: -102, minLat: 31, maxLat: 49 },
    'America/Los_Angeles': { minLng: -125, maxLng: -102, minLat: 32, maxLat: 49 },
    'Europe/London': { minLng: -10, maxLng: 2, minLat: 50, maxLat: 61 },
    'Asia/Dubai': { minLng: 51, maxLng: 57, minLat: 24, maxLat: 26 },
    'Asia/Karachi': { minLng: 60, maxLng: 78, minLat: 23, maxLat: 37 },
    'Asia/Kolkata': { minLng: 68, maxLng: 97, minLat: 6, maxLat: 37 },
    'Australia/Sydney': { minLng: 113, maxLng: 154, minLat: -44, maxLat: -10 }
  };
  
  for (const [tz, bounds] of Object.entries(timezoneMap)) {
    if (
      longitude >= bounds.minLng &&
      longitude <= bounds.maxLng &&
      latitude >= bounds.minLat &&
      latitude <= bounds.maxLat
    ) {
      return tz;
    }
  }
  
  return 'UTC';
}

module.exports = {
  isValidIANATimezone,
  validateTimezone,
  getTimezoneFromCoordinates
};
