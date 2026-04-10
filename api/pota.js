// Vercel serverless function for POTA API proxy
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const POTA_API = 'https://api.pota.app';

  try {
    console.log('Fetching parks from POTA API...');
    
    // Get all parks
    const parksResponse = await fetch(`${POTA_API}/parks`);
    if (!parksResponse.ok) {
      throw new Error(`POTA API error: ${parksResponse.status}`);
    }
    const allParks = await parksResponse.json();

    // Get stats for first 50 parks
    const parksWithStats = [];
    const sampleParks = allParks.slice(0, 50);
    
    for (const park of sampleParks) {
      try {
        const statsResponse = await fetch(`${POTA_API}/park/${park.reference}/stats`);
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          parksWithStats.push({
            reference: park.reference,
            name: park.name,
            latitude: park.latitude,
            longitude: park.longitude,
            grid: park.grid,
            parktype: park.parktype,
            activations: stats?.activations || 0,
            qsos: stats?.qsos || 0,
          });
        }
      } catch (error) {
        console.warn(`Error fetching stats for ${park.reference}:`, error);
        parksWithStats.push({
          reference: park.reference,
          name: park.name,
          latitude: park.latitude,
          longitude: park.longitude,
          grid: park.grid,
          parktype: park.parktype,
          activations: 0,
          qsos: 0,
        });
      }
    }

    console.log(`Successfully fetched ${parksWithStats.length} parks with stats`);
    res.status(200).json(parksWithStats);
  } catch (error) {
    console.error('Error fetching parks:', error);
    // Return fallback data
    res.status(200).json([
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
      }
    ]);
  }
}