// Marker utilities for POTA parks

// Get color based on activation count
function getMarkerColor(activations) {
  if (activations === 0) return '#FFD700'; // Gold - blinking for unactivated
  if (activations <= 4) return '#FF4444'; // Red
  if (activations <= 14) return '#FF8800'; // Orange
  if (activations <= 29) return '#FFCC00'; // Yellow
  if (activations <= 49) return '#88FF88'; // Light Green
  if (activations <= 99) return '#00AA00'; // Green
  return '#006600'; // Dark Green - 100+ activations
}

// Create custom marker icon
function createMarkerIcon(activations, isUnactivated = false) {
  const color = getMarkerColor(activations);
  const className = isUnactivated ? 'blinking-marker' : '';
  
  return L.divIcon({
    className: `custom-marker ${className}`,
    html: `<div style="
      background-color: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

// Create popup content for a park
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
      <div style="margin: 8px 0; padding: 8px; background: ${color}; border-radius: 4px; text-align: center; color: white;">
        ${isUnactivated ? 'Unactivated - Blinking!' : 'Status: ' + getStatusLabel(park.activations)}
      </div>
      <a href="https://pota.app/#/park/${park.reference}" target="_blank" class="link">
        View on POTA.app
      </a>
    </div>
  `;
}

// Get status label based on activation count
function getStatusLabel(activations) {
  if (activations === 0) return 'Unactivated';
  if (activations <= 4) return 'Low';
  if (activations <= 14) return 'Medium-Low';
  if (activations <= 29) return 'Medium';
  if (activations <= 49) return 'Medium-High';
  if (activations <= 99) return 'High';
  return 'Very High';
}

// Create marker for a park
function createParkMarker(park, map) {
  const isUnactivated = park.activations === 0;
  const icon = createMarkerIcon(park.activations, isUnactivated);
  
  const marker = L.marker([park.latitude, park.longitude], { icon })
    .bindPopup(createPopupContent(park));
  
  return marker;
}

// Add parks to map
function addParksToMap(parks, map, markerClusterGroup) {
  parks.forEach(park => {
    const marker = createParkMarker(park, map);
    markerClusterGroup.addLayer(marker);
  });
}

// Clear all markers
function clearMarkers(markerClusterGroup) {
  markerClusterGroup.clearLayers();
}

export {
  getMarkerColor,
  createMarkerIcon,
  createPopupContent,
  createParkMarker,
  addParksToMap,
  clearMarkers,
  getStatusLabel
};