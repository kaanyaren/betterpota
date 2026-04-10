// API client for POTA data

const API_BASE_URL = 'https://api.pota.app';

// Get park information
async function getParkInfo(reference) {
  try {
    const response = await fetch(`${API_BASE_URL}/park/${reference}/info`);
    if (!response.ok) throw new Error('Failed to fetch park info');
    return await response.json();
  } catch (error) {
    console.error('Error fetching park info:', error);
    return null;
  }
}

// Get park statistics
async function getParkStats(reference) {
  try {
    const response = await fetch(`${API_BASE_URL}/park/${reference}/stats`);
    if (!response.ok) throw new Error('Failed to fetch park stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching park stats:', error);
    return null;
  }
}

// Get parks by location
async function getParksByLocation(location) {
  try {
    const response = await fetch(`${API_BASE_URL}/location/${location}/parks`);
    if (!response.ok) throw new Error('Failed to fetch parks by location');
    return await response.json();
  } catch (error) {
    console.error('Error fetching parks by location:', error);
    return [];
  }
}

// Get live spots
async function getLiveSpots() {
  try {
    const response = await fetch(`${API_BASE_URL}/spot/activator`);
    if (!response.ok) throw new Error('Failed to fetch live spots');
    return await response.json();
  } catch (error) {
    console.error('Error fetching live spots:', error);
    return [];
  }
}

// Get park data with combined info and stats
async function getParkData(reference) {
  const [info, stats] = await Promise.all([
    getParkInfo(reference),
    getParkStats(reference)
  ]);
  
  if (!info) return null;
  
  return {
    reference: info.reference,
    name: info.name,
    latitude: info.latitude,
    longitude: info.longitude,
    grid: info.grid,
    parktype: info.parktype,
    activations: stats?.activations || 0,
    qsos: stats?.qsos || 0
  };
}

// Get parks for a location with combined data
async function getParksForLocation(location) {
  const parks = await getParksByLocation(location);
  
  // Fetch stats for all parks
  const parkDataPromises = parks.map(async (park) => {
    const stats = await getParkStats(park.reference);
    return {
      reference: park.reference,
      name: park.name,
      latitude: park.latitude,
      longitude: park.longitude,
      grid: park.grid,
      parktype: park.parktype,
      activations: stats?.activations || 0,
      qsos: stats?.qsos || 0
    };
  });
  
  return await Promise.all(parkDataPromises);
}

export {
  getParkInfo,
  getParkStats,
  getParksByLocation,
  getLiveSpots,
  getParkData,
  getParksForLocation
};