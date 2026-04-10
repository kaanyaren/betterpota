// POTA API proxy client with fallback data
async function getAllParksFromConvex() {
  try {
    console.log('Trying to fetch parks from Convex backend...');
    const response = await fetch('https://fortunate-owl-356.convex.cloud/getAllParksWithStats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Successfully fetched parks from Convex:', result.length);
      return result;
    }
  } catch (error) {
    console.log('Convex backend unavailable, using fallback data');
  }
  
  // Fallback to demonstration data
  return getFallbackParks();
}

function getFallbackParks() {
  return [
    {
      reference: "K-1000",
      name: "Central Park",
      latitude: 40.7829,
      longitude: -73.9654,
      grid: "FN31",
      parktype: "National Park",
      activations: 45,
      qsos: 890
    },
    {
      reference: "K-1001",
      name: "Yellowstone National Park",
      latitude: 44.4280,
      longitude: -110.5885,
      grid: "DN63",
      parktype: "National Park",
      activations: 120,
      qsos: 2450
    },
    {
      reference: "K-1002",
      name: "Grand Canyon National Park",
      latitude: 36.0544,
      longitude: -112.1401,
      grid: "DM37",
      parktype: "National Park",
      activations: 85,
      qsos: 1780
    },
    {
      reference: "K-1003",
      name: "Yosemite National Park",
      latitude: 37.8651,
      longitude: -119.5383,
      grid: "CM09",
      parktype: "National Park",
      activations: 95,
      qsos: 2100
    },
    {
      reference: "K-1004",
      name: "Great Smoky Mountains National Park",
      latitude: 35.6118,
      longitude: -83.4895,
      grid: "EM84",
      parktype: "National Park",
      activations: 78,
      qsos: 1650
    },
    {
      reference: "K-1005",
      name: "Zion National Park",
      latitude: 37.2982,
      longitude: -113.0263,
      grid: "DM37",
      parktype: "National Park",
      activations: 62,
      qsos: 1340
    }
  ];
}

// Make functions available globally
window.getAllParksFromConvex = getAllParksFromConvex;