// Main map initialization and management

import { getParksForLocation } from './api.js';
import { addParksToMap, clearMarkers, getMarkerColor, getStatusLabel } from './markers.js';

let map;
let markerClusterGroup;
let currentLocation = 'US-GA'; // Default location

// Initialize the map
function initMap() {
  // Create map
  map = L.map('map').setView([39.8283, -98.5795], 4); // Center on US
  
  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  
  // Initialize marker cluster group
  markerClusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: true,
    zoomToBoundsOnClick: true
  });
  
  map.addLayer(markerClusterGroup);
  
  // Load initial data
  loadParksForLocation(currentLocation);
  
  // Set up event listeners
  setupEventListeners();
  
  // Create legend
  createLegend();
}

// Load parks for a specific location
async function loadParksForLocation(location) {
  try {
    showLoading(true);
    clearMarkers(markerClusterGroup);
    
    const parks = await getParksForLocation(location);
    
    if (parks.length > 0) {
      addParksToMap(parks, map, markerClusterGroup);
      
      // Fit map bounds to show all markers
      const group = new L.featureGroup(markerClusterGroup.getLayers());
      map.fitBounds(group.getBounds().pad(0.1));
    } else {
      console.warn('No parks found for location:', location);
    }
  } catch (error) {
    console.error('Error loading parks:', error);
  } finally {
    showLoading(false);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Region selector change
  const regionSelector = document.getElementById('region-selector');
  if (regionSelector) {
    regionSelector.addEventListener('change', (e) => {
      currentLocation = e.target.value;
      loadParksForLocation(currentLocation);
    });
  }
  
  // Search functionality
  const searchInput = document.getElementById('park-search');
  const searchButton = document.getElementById('search-button');
  
  if (searchInput && searchButton) {
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSearch();
    });
  }
}

// Handle park search
function handleSearch() {
  const searchInput = document.getElementById('park-search');
  const reference = searchInput.value.trim().toUpperCase();
  
  if (reference) {
    // For now, we'll just log the search
    // In a real implementation, we would search through the loaded parks
    // or fetch specific park data
    console.log('Searching for park:', reference);
    // TODO: Implement park search functionality
  }
}

// Show/hide loading indicator
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

// Create legend
function createLegend() {
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.innerHTML = `
    <h4>Park Status</h4>
    <div class="legend-item">
      <div class="legend-color blinking" style="background-color: #FFD700;"></div>
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

// Export functions for use in Astro components
export { initMap, loadParksForLocation };