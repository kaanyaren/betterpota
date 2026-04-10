// Main map initialization and management - bundled for GitHub Pages

const L = window.L;

let map;
let currentLocation = 'all';
let currentBounds = null;

const PARKS_CACHE_KEY = 'betterpota:allParks:v1';
const PARKS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function fetchAllParksFromPotaApi() {
  try {
    const cached = localStorage.getItem(PARKS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.parks) && Date.now() - parsed.timestamp < PARKS_CACHE_TTL_MS) {
        console.log('Using cached parks:', parsed.parks.length);
        return parsed.parks;
      }
    }
  } catch (cacheError) {
    console.warn('Failed reading parks cache:', cacheError);
  }

  const programs = await fetchJson('https://api.pota.app/programs/locations');
  const prefixes = programs
    .filter((program) => Number(program.parks) > 0)
    .map((program) => program.prefix)
    .filter((prefix) => typeof prefix === 'string' && prefix.length > 0);

  const parksByReference = new Map();
  const concurrency = 20;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < prefixes.length) {
      const index = nextIndex;
      nextIndex += 1;
      const prefix = prefixes[index];

      try {
        const programParks = await fetchJson(`https://api.pota.app/program/parks/${encodeURIComponent(prefix)}`);
        for (const park of programParks) {
          if (!park || parksByReference.has(park.reference)) {
            continue;
          }

          const latitude = Number(park.latitude);
          const longitude = Number(park.longitude);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            continue;
          }

          parksByReference.set(park.reference, {
            reference: park.reference,
            name: park.name,
            latitude,
            longitude,
            grid: park.grid,
            parktype: park.parktype || park.locationDesc || 'Park',
            activations: Number(park.activations) || 0,
            qsos: Number(park.qsos) || 0,
          });
        }
      } catch (error) {
        console.warn(`Failed loading program ${prefix}:`, error);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  const parks = Array.from(parksByReference.values());

  try {
    localStorage.setItem(PARKS_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      parks,
    }));
  } catch (cacheError) {
    console.warn('Failed writing parks cache:', cacheError);
  }

  return parks;
}

async function getAllParks() {
  try {
    console.log('Fetching all parks directly from POTA API...');
    const parks = await fetchAllParksFromPotaApi();
    if (parks.length > 0) {
      console.log('Successfully fetched parks from POTA API:', parks.length);
      return parks;
    }

    throw new Error('POTA API returned no parks');
  } catch (error) {
    console.error('Error fetching parks from POTA API:', error);

    // Fallback to Convex HTTP action if available
    try {
      if (typeof window.getAllParksFromConvex === 'function') {
        const parks = await window.getAllParksFromConvex();
        console.log('Successfully fetched parks from Convex:', parks.length);
        return parks;
      }
    } catch (fallbackError) {
      console.error('Convex fallback also failed:', fallbackError);
    }

    // Final fallback to demonstration data
    return getGlobalFallbackParks();
  }
}

async function getParksForLocation(location) {
  console.log('Fetching parks for:', location);
  if (location === 'all') {
    return await getAllParks();
  }
  
  // Fallback for other locations
  return getFallbackParks(location);
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

function getMarkerColor(activations) {
  if (activations === 0) return '#FFD700';
  if (activations <= 4) return '#FF4444';
  if (activations <= 14) return '#FF8800';
  if (activations <= 29) return '#FFCC00';
  if (activations <= 49) return '#88FF88';
  if (activations <= 99) return '#00AA00';
  return '#006600';
}

function createMarkerIcon(activations, isUnactivated = false) {
  const color = getMarkerColor(activations);
  const className = isUnactivated ? 'blinking-marker' : '';
  
  return L.divIcon({
    className: `custom-marker ${className}`,
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

function getStatusLabel(activations) {
  if (activations === 0) return 'Unactivated';
  if (activations <= 4) return 'Low';
  if (activations <= 14) return 'Medium-Low';
  if (activations <= 29) return 'Medium';
  if (activations <= 49) return 'Medium-High';
  if (activations <= 99) return 'High';
  return 'Very High';
}

function createPopupContent(park) {
  const isUnactivated = park.activations === 0;
  const color = getMarkerColor(park.activations);
  
  return `
    <div class="park-popup">
      <h3>${park.name}</h3>
      <div class="reference">${park.reference}</div>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${park.activations}</div>
          <div class="stat-label">Activations</div>
        </div>
        <div class="stat">
          <div class="stat-value">${park.qsos}</div>
          <div class="stat-label">QSOs</div>
        </div>
      </div>
      <div style="margin: 8px 0; padding: 8px; background: ${color}; border-radius: 4px; text-align: center; color: white; font-weight: bold;">
        ${isUnactivated ? 'Unactivated' : getStatusLabel(park.activations)}
      </div>
      <a href="https://pota.app/#/park/${park.reference}" target="_blank" class="link">
        View on POTA.app
      </a>
    </div>
  `;
}

function createParkMarker(park) {
  const isUnactivated = park.activations === 0;
  const icon = createMarkerIcon(park.activations, isUnactivated);
  
  return L.marker([park.latitude, park.longitude], { icon })
    .bindPopup(createPopupContent(park));
}

async function addParksToMap(parks) {
  var layer = window.parksLayer;
  if (!layer) return;

  const BATCH_SIZE = 400;
  let index = 0;

  while (index < parks.length) {
    const batch = parks.slice(index, index + BATCH_SIZE);
    const markers = [];

    for (const park of batch) {
      if (!currentBounds) {
        currentBounds = L.latLngBounds([park.latitude, park.longitude], [park.latitude, park.longitude]);
      } else {
        currentBounds.extend([park.latitude, park.longitude]);
      }

      markers.push(createParkMarker(park));
    }

    if (typeof layer.addLayers === 'function') {
      layer.addLayers(markers);
    } else {
      for (const marker of markers) {
        layer.addLayer(marker);
      }
    }

    index += BATCH_SIZE;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

function clearMarkers() {
  var layer = window.parksLayer;
  currentBounds = null;
  if (layer) {
    layer.clearLayers();
  }
}

function initMap() {
  console.log('initMap called, L available:', typeof L !== 'undefined');
  map = L.map('map').setView([39.8283, -98.5795], 4);
  console.log('Map initialized');
  
  // CartoDB Voyager (light) basemap
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors, © CARTO',
    maxZoom: 20
  }).addTo(map);
  
  // Marker cluster with chunked loading to keep UI responsive
  var parksLayer = L.markerClusterGroup({
    chunkedLoading: true,
    chunkDelay: 20,
    chunkInterval: 80,
    removeOutsideVisibleBounds: true,
    maxClusterRadius: 60,
  }).addTo(map);
  
  // Store the layer for later use
  window.parksLayer = parksLayer;
  
  loadParksForLocation(currentLocation);
  createLegend();
}

async function loadParksForLocation(location) {
  try {
    showLoading(true);
    clearMarkers();
    
    console.log('Loading parks for location:', location);
    const parks = await getParksForLocation(location);
    console.log('Parks loaded:', parks.length, parks);
    
    if (parks.length > 0) {
      await addParksToMap(parks);
      console.log('Markers added to map');

      if (currentBounds && parks.length <= 20000) {
        map.fitBounds(currentBounds.pad(0.05));
        console.log('Map bounds fitted to markers');
      }
    } else {
      console.warn('No parks found for location:', location);
    }
  } catch (error) {
    console.error('Error loading parks:', error);
  } finally {
    showLoading(false);
  }
}

function showLoading(show) {
  let loadingEl = document.getElementById('loading');
  
  if (show) {
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.id = 'loading';
      loadingEl.className = 'loading';
      loadingEl.textContent = 'Loading parks...';
      document.body.appendChild(loadingEl);
    }
    loadingEl.style.display = 'block';
  } else if (loadingEl) {
    loadingEl.style.display = 'none';
  }
}

function getFallbackParks(location) {
  // Fallback data for demonstration when API is unavailable
  const fallbackData = {
    'US-GA': [
      {
        reference: 'K-2950',
        name: 'Stone Mountain Park',
        latitude: 33.8062,
        longitude: -84.1449,
        grid: 'EM73',
        parktype: 'State Park',
        activations: 15,
        qsos: 320
      },
      {
        reference: 'K-2951',
        name: 'Sweetwater Creek State Park',
        latitude: 33.7569,
        longitude: -84.6283,
        grid: 'EM73',
        parktype: 'State Park',
        activations: 8,
        qsos: 156
      },
      {
        reference: 'K-2952',
        name: 'Chattahoochee River National Recreation Area',
        latitude: 33.9904,
        longitude: -84.3214,
        grid: 'EM73',
        parktype: 'National Recreation Area',
        activations: 0,
        qsos: 0
      }
    ],
    'all': [
      {
        reference: 'K-1000',
        name: 'Central Park',
        latitude: 40.7829,
        longitude: -73.9654,
        grid: 'FN31',
        parktype: 'National Park',
        activations: 45,
        qsos: 890
      },
      {
        reference: 'K-1001',
        name: 'Yellowstone National Park',
        latitude: 44.4280,
        longitude: -110.5885,
        grid: 'DN63',
        parktype: 'National Park',
        activations: 120,
        qsos: 2450
      },
      {
        reference: 'K-1002',
        name: 'Grand Canyon National Park',
        latitude: 36.0544,
        longitude: -112.1401,
        grid: 'DM37',
        parktype: 'National Park',
        activations: 85,
        qsos: 1780
      },
      {
        reference: 'K-1003',
        name: 'Yosemite National Park',
        latitude: 37.8651,
        longitude: -119.5383,
        grid: 'CM09',
        parktype: 'National Park',
        activations: 95,
        qsos: 2100
      },
      {
        reference: 'K-1004',
        name: 'Great Smoky Mountains National Park',
        latitude: 35.6118,
        longitude: -83.4895,
        grid: 'EM84',
        parktype: 'National Park',
        activations: 78,
        qsos: 1650
      },
      {
        reference: 'K-1005',
        name: 'Zion National Park',
        latitude: 37.2982,
        longitude: -113.0263,
        grid: 'DM37',
        parktype: 'National Park',
        activations: 62,
        qsos: 1340
      },
      {
        reference: 'K-1006',
        name: 'Rocky Mountain National Park',
        latitude: 40.3428,
        longitude: -105.6836,
        grid: 'DM79',
        parktype: 'National Park',
        activations: 88,
        qsos: 1920
      },
      {
        reference: 'K-1007',
        name: 'Acadia National Park',
        latitude: 44.3386,
        longitude: -68.2733,
        grid: 'FN54',
        parktype: 'National Park',
        activations: 52,
        qsos: 1100
      },
      {
        reference: 'K-1008',
        name: 'Everglades National Park',
        latitude: 25.2866,
        longitude: -80.8987,
        grid: 'EL97',
        parktype: 'National Park',
        activations: 34,
        qsos: 720
      },
      {
        reference: 'K-1009',
        name: 'Glacier National Park',
        latitude: 48.7596,
        longitude: -113.7870,
        grid: 'DN47',
        parktype: 'National Park',
        activations: 41,
        qsos: 890
      }
    ]
  };
  
  return fallbackData[location] || fallbackData['all'];
}

function createLegend() {
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.innerHTML = `
    <h4>Park Status</h4>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #FFD700;"></div>
      <span>Unactivated (0)</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #FF4444;"></div>
      <span>Low (1-4)</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #FF8800;"></div>
      <span>Medium-Low (5-14)</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #FFCC00;"></div>
      <span>Medium (15-29)</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #88FF88;"></div>
      <span>Medium-High (30-49)</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #00AA00;"></div>
      <span>High (50-99)</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #006600;"></div>
      <span>Very High (100+)</span>
    </div>
  `;
  
  document.body.appendChild(legend);
}

function getGlobalFallbackParks() {
  return [
    // US Parks
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
    // Canada Parks
    {
      reference: "VE-0010",
      name: "Banff National Park",
      latitude: 51.4968,
      longitude: -115.9281,
      grid: "DO20",
      parktype: "National Park",
      activations: 32,
      qsos: 680
    },
    {
      reference: "VE-0020",
      name: "Jasper National Park",
      latitude: 52.8733,
      longitude: -118.0813,
      grid: "DO35",
      parktype: "National Park",
      activations: 28,
      qsos: 520
    },
    // UK Parks
    {
      reference: "G-0010",
      name: "Lake District National Park",
      latitude: 54.4609,
      longitude: -3.0886,
      grid: "IO84",
      parktype: "National Park",
      activations: 15,
      qsos: 320
    },
    {
      reference: "G-0020",
      name: "Snowdonia National Park",
      latitude: 53.0685,
      longitude: -4.0763,
      grid: "IO73",
      parktype: "National Park",
      activations: 18,
      qsos: 380
    },
    // Australia Parks
    {
      reference: "VK-0010",
      name: "Blue Mountains National Park",
      latitude: -33.6150,
      longitude: 150.4769,
      grid: "QF56",
      parktype: "National Park",
      activations: 22,
      qsos: 450
    },
    {
      reference: "VK-0020",
      name: "Kakadu National Park",
      latitude: -12.4210,
      longitude: 132.8340,
      grid: "PI52",
      parktype: "National Park",
      activations: 8,
      qsos: 180
    },
    // Japan Parks
    {
      reference: "JA-0010",
      name: "Fuji-Hakone-Izu National Park",
      latitude: 35.3606,
      longitude: 138.7274,
      grid: "PM85",
      parktype: "National Park",
      activations: 25,
      qsos: 510
    },
    // Germany Parks
    {
      reference: "DL-0010",
      name: "Bavarian Forest National Park",
      latitude: 49.0000,
      longitude: 13.3833,
      grid: "JN68",
      parktype: "National Park",
      activations: 12,
      qsos: 240
    },
    // New Zealand Parks
    {
      reference: "ZL-0010",
      name: "Fiordland National Park",
      latitude: -44.9625,
      longitude: 167.6100,
      grid: "RE38",
      parktype: "National Park",
      activations: 10,
      qsos: 210
    }
  ];
}

window.initMap = initMap;
window.loadParksForLocation = loadParksForLocation;
