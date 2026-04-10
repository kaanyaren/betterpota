// Main map initialization and management - bundled for GitHub Pages

const L = window.L;

let map;
let currentLocation = 'default';

const POTA_API = 'https://api.pota.app';

async function getParkStats(reference) {
  try {
    const response = await fetch(`${POTA_API}/park/${reference}/stats`);
    if (!response.ok) throw new Error('Failed to fetch park stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching park stats:', error);
    return null;
  }
}

async function getParksByLocation(location) {
  try {
    const response = await fetch(`${POTA_API}/location/${location}/parks`);
    if (!response.ok) throw new Error('Failed to fetch parks by location');
    return await response.json();
  } catch (error) {
    console.error('Error fetching parks by location:', error);
    return [];
  }
}

async function getParksForLocation(location) {
  console.log('Fetching parks for location:', location);
  try {
    const parks = await getParksByLocation(location);
    console.log('API parks response:', parks);
    const enriched = await Promise.all(
      parks.map(async (park) => {
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
      })
    );
    console.log('Enriched parks:', enriched);
    return enriched;
  } catch (error) {
    console.error('Error fetching parks from API, using fallback data:', error);
    const fallback = getFallbackParks(location);
    console.log('Using fallback parks:', fallback);
    return fallback;
  }
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
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
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
    'default': [
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
      }
    ]
  };
  
  return fallbackData[location] || fallbackData['default'];
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