// Convex client for BetterPOTA - uses HTTP actions to bypass CORS
const CONVEX_URL = 'https://fortunate-owl-356.convex.cloud';

async function convexQuery(action, args = {}) {
  try {
    const response = await fetch(`${CONVEX_URL}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error calling Convex action ${action}:`, error);
    throw error;
  }
}

// POTA API functions using Convex backend
async function getAllParksFromConvex() {
  try {
    console.log('Fetching parks from Convex backend...');
    const result = await convexQuery('getAllParksWithStats');
    console.log('Parks from Convex:', result.length);
    return result;
  } catch (error) {
    console.error('Failed to fetch parks from Convex:', error);
    return [];
  }
}

async function getParksFromConvex() {
  try {
    console.log('Fetching parks from Convex...');
    const result = await convexQuery('getParks');
    console.log('Parks from Convex:', result.length);
    return result;
  } catch (error) {
    console.error('Failed to fetch parks from Convex:', error);
    return [];
  }
}

async function getParkStatsFromConvex(reference) {
  try {
    const result = await convexQuery('getParkStats', { reference });
    return result;
  } catch (error) {
    console.error('Failed to fetch park stats from Convex:', error);
    return { activations: 0, qsos: 0 };
  }
}

// Make functions available globally
window.getAllParksFromConvex = getAllParksFromConvex;
window.getParksFromConvex = getParksFromConvex;
window.getParkStatsFromConvex = getParkStatsFromConvex;