// Main map initialization and management - bundled for GitHub Pages

const L = window.L;

let map;
let ciLayer;
let locationsIndex = [];
const loadedLocations = new Set();
const parksByReference = new Map();
let loadingInProgress = false;
let debounceTimer = null;

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function loadLocationsIndex() {
  try {
    const programs = await fetchJson('https://api.pota.app/programs/locations');
    const locations = [];
    for (const program of programs) {
      for (const entity of program.entities || []) {
        for (const loc of entity.locations || []) {
          if (loc.parks > 0 && loc.latitude != null && loc.longitude != null) {
            locations.push({
              descriptor: loc.descriptor,
              lat: loc.latitude,
              lon: loc.longitude,
              parkCount: loc.parks,
            });
          }
        }
      }
    }
    console.log('Location index built:', locations.length, 'locations');
    return locations;
  } catch (error) {
    console.error('Failed to load locations index:', error);
    return [];
  }
}

function getLocationsInViewport() {
  const bounds = map.getBounds();
  const result = [];
  for (const loc of locationsIndex) {
    if (bounds.contains(L.latLng(loc.lat, loc.lon))) {
      result.push(loc);
    }
  }
  return result;
}

async function loadParksForViewport() {
  if (loadingInProgress || locationsIndex.length === 0) return;

  const visibleLocations = getLocationsInViewport();
  const newLocations = visibleLocations.filter(
    (loc) => !loadedLocations.has(loc.descriptor)
  );

  if (newLocations.length === 0) return;

  loadingInProgress = true;
  showLoading(true);
  updateParkCounter();

  try {
    const BATCH_CONCURRENCY = 6;
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < newLocations.length) {
        const idx = nextIndex++;
        const loc = newLocations[idx];
        loadedLocations.add(loc.descriptor);

        try {
          const parks = await fetchJson(
            `https://api.pota.app/location/parks/${encodeURIComponent(loc.descriptor)}`
          );
          for (const park of parks) {
            const latitude = Number(park.latitude);
            const longitude = Number(park.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

            const ref = park.reference;
            if (parksByReference.has(ref)) continue;

            const parkData = {
              reference: ref,
              name: park.name,
              latitude,
              longitude,
              grid: park.grid,
              parktype: park.parktype || park.locationDesc || 'Park',
              activations: Number(park.activations) || 0,
              qsos: Number(park.qsos) || 0,
            };

            parksByReference.set(ref, parkData);
            addParkToCanvas(parkData);
          }
        } catch (error) {
          console.warn(`Failed loading location ${loc.descriptor}:`, error);
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(BATCH_CONCURRENCY, newLocations.length) }, worker)
    );

    updateParkCounter();
  } catch (error) {
    console.error('Error loading viewport parks:', error);
  } finally {
    loadingInProgress = false;
    showLoading(false);
  }
}

function onMapMoveEnd() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadParksForViewport();
  }, 300);
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

function getStatusLabel(activations) {
  if (activations === 0) return 'Unactivated';
  if (activations <= 4) return 'Low';
  if (activations <= 14) return 'Medium-Low';
  if (activations <= 29) return 'Medium';
  if (activations <= 49) return 'Medium-High';
  if (activations <= 99) return 'High';
  return 'Very High';
}

function addParkToCanvas(park) {
  if (!ciLayer) return;

  const color = getMarkerColor(park.activations);
  const icon = L.icon({
    iconUrl: createCircleDataUrl(color),
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

  const marker = L.marker([park.latitude, park.longitude], { icon });
  marker.parkReference = park.reference;
  ciLayer.addMarker(marker);
}

function createCircleDataUrl(color) {
  const size = 12;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const r = size / 2;

  ctx.beginPath();
  ctx.arc(r, r, r - 1.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  return canvas.toDataURL();
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

function initMap() {
  console.log('initMap called, L available:', typeof L !== 'undefined');
  map = L.map('map').setView([39.8283, -98.5795], 4);
  console.log('Map initialized');

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors, &copy; CARTO',
    maxZoom: 20,
  }).addTo(map);

  ciLayer = L.canvasIconLayer({}).addTo(map);

  ciLayer.addOnClickListener(function (e, data) {
    if (!data || data.length === 0) return;
    const marker = data[0];
    const ref = marker.data && marker.data.parkReference;
    if (!ref) return;
    const park = parksByReference.get(ref);
    if (!park) return;

    const popup = L.popup()
      .setLatLng([park.latitude, park.longitude])
      .setContent(createPopupContent(park))
      .openOn(map);
  });

  map.on('moveend', onMapMoveEnd);

  createLegend();
  createParkCounter();

  (async function () {
    showLoading(true);
    locationsIndex = await loadLocationsIndex();
    if (locationsIndex.length > 0) {
      await loadParksForViewport();
    } else {
      await loadFallbackParks();
    }
    showLoading(false);
  })();
}

async function loadFallbackParks() {
  const fallbackParks = [
    { reference: "K-0001", name: "Yellowstone National Park", latitude: 44.428, longitude: -110.5885, grid: "DN63", parktype: "National Park", activations: 120, qsos: 2450 },
    { reference: "K-0002", name: "Grand Canyon National Park", latitude: 36.0544, longitude: -112.1401, grid: "DM37", parktype: "National Park", activations: 85, qsos: 1780 },
    { reference: "K-0003", name: "Yosemite National Park", latitude: 37.8651, longitude: -119.5383, grid: "CM09", parktype: "National Park", activations: 95, qsos: 2100 },
    { reference: "K-0004", name: "Great Smoky Mountains NP", latitude: 35.6118, longitude: -83.4895, grid: "EM84", parktype: "National Park", activations: 78, qsos: 1650 },
    { reference: "K-0005", name: "Zion National Park", latitude: 37.2982, longitude: -113.0263, grid: "DM37", parktype: "National Park", activations: 62, qsos: 1340 },
    { reference: "VE-0001", name: "Banff National Park", latitude: 51.4968, longitude: -115.9281, grid: "DO20", parktype: "National Park", activations: 32, qsos: 680 },
    { reference: "G-0001", name: "Lake District National Park", latitude: 54.4609, longitude: -3.0886, grid: "IO84", parktype: "National Park", activations: 15, qsos: 320 },
    { reference: "VK-0001", name: "Blue Mountains NP", latitude: -33.615, longitude: 150.4769, grid: "QF56", parktype: "National Park", activations: 22, qsos: 450 },
    { reference: "JA-0001", name: "Fuji-Hakone-Izu NP", latitude: 35.3606, longitude: 138.7274, grid: "PM85", parktype: "National Park", activations: 25, qsos: 510 },
    { reference: "DL-0001", name: "Bavarian Forest NP", latitude: 49.0, longitude: 13.3833, grid: "JN68", parktype: "National Park", activations: 12, qsos: 240 },
  ];

  for (const park of fallbackParks) {
    parksByReference.set(park.reference, park);
    addParkToCanvas(park);
  }
  updateParkCounter();
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

function createParkCounter() {
  let counterEl = document.getElementById('park-counter');
  if (!counterEl) {
    counterEl = document.createElement('div');
    counterEl.id = 'park-counter';
    counterEl.className = 'park-counter';
    document.body.appendChild(counterEl);
  }
}

function updateParkCounter() {
  const counterEl = document.getElementById('park-counter');
  if (counterEl) {
    counterEl.textContent = `${parksByReference.size} parks loaded`;
  }
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
window.loadParksForLocation = function () {
  loadedLocations.clear();
  parksByReference.clear();
  if (ciLayer) {
    ciLayer.clearLayers();
  }
  loadParksForViewport();
};
