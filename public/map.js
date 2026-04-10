// Main map initialization and management - bundled for GitHub Pages

const L = window.L;

let map;
let currentLocation = 'all';

const POTA_API = 'https://api.pota.app';

async function getAllParks() {
  try {
    console.log('Fetching all parks from POTA API...');
    const response = await fetch(`${POTA_API}/parks`);
    if (!response.ok) throw new Error('Failed to fetch all parks');
    const parks = await response.json();
    console.log('All parks fetched:', parks.length);
    
    // Get stats for a sample of parks (to avoid too many API calls)
    const sampleParks = parks.slice(0, 100); // Limit to first 100 for demo
    const enriched = await Promise.all(
      sampleParks.map(async (park) => {
        try {
          const statsResponse = await fetch(`${POTA_API}/park/${park.reference}/stats`);
          if (statsResponse.ok) {
            const stats = await statsResponse.json();
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
          }
        } catch (error) {
          console.warn('Error fetching stats for park', park.reference, error);
        }
        // Return basic park info if stats fail
        return {
          reference: park.reference,
          name: park.name,
          latitude: park.latitude,
          longitude: park.longitude,
          grid: park.grid,
          parktype: park.parktype,
          activations: 0,
          qsos: 0
        };
      })
    );
    
    return enriched.filter(park => park !== null);
  } catch (error) {
    console.error('Error fetching all parks from API:', error);
    return getFallbackParks('all');
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

function addParksToMap(parks) {
  var layer = window.parksLayer;
  if (!layer) return;
  
  parks.forEach(park => {
    var marker = createParkMarker(park);
    layer.addLayer(marker);
  });
}

function clearMarkers() {
  var layer = window.parksLayer;
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
  
  // Simple layer group instead of marker cluster for now
  var parksLayer = L.layerGroup().addTo(map);
  
  // Store the layer for later use
  window.parksLayer = parksLayer;
  
  // Add a test marker to verify markers work
  var testIcon = createMarkerIcon(10, false);
  var testMarker = L.marker([39.8283, -98.5795], { icon: testIcon }).addTo(map)
    .bindPopup('Test marker - if you see this, markers work!');
  
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
      addParksToMap(parks);
      console.log('Markers added to map');
      
      // Fit bounds to markers
      var layers = [];
      window.parksLayer.eachLayer(function(layer) {
        layers.push(layer);
      });
      if (layers.length > 0) {
        var group = L.featureGroup(layers);
        map.fitBounds(group.getBounds().pad(0.1));
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

window.initMap = initMap;
window.loadParksForLocation = loadParksForLocation;