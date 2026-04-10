const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const POTA_API = 'https://api.pota.app';

// Cache for parks data
let parksCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// Get all parks with stats
app.get('/api/parks', async (req, res) => {
  try {
    // Check cache first
    if (parksCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
      console.log('Returning cached parks data');
      return res.json(parksCache);
    }

    console.log('Fetching fresh parks data from POTA API');
    
    // Get all parks
    const parksResponse = await fetch(`${POTA_API}/parks`);
    if (!parksResponse.ok) {
      throw new Error(`POTA API error: ${parksResponse.status}`);
    }
    const allParks = await parksResponse.json();

    // Get stats for first 100 parks
    const parksWithStats = [];
    const sampleParks = allParks.slice(0, 100);
    
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

    // Update cache
    parksCache = parksWithStats;
    cacheTimestamp = Date.now();

    res.json(parksWithStats);
  } catch (error) {
    console.error('Error fetching parks:', error);
    // Return fallback data
    res.json([
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
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`POTA Proxy Server running on port ${PORT}`);
});