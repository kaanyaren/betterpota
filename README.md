# BetterPOTA - Parks on the Air Interactive Map

A real-time POTA park map that visualizes activation status through intuitive color coding and animation. The map serves as both a practical tool for hunters seeking unactivated parks and a visual celebration of the POTA community's activity.

## Features

- **Interactive park markers** with color-coded status based on activation counts
- **Blinking animation** for unactivated parks to draw attention
- **Region filtering** - select different countries and states
- **Marker clustering** for better performance with large datasets
- **Detailed popups** with park information, activation stats, and links to POTA.app
- **Mobile responsive** design

## Visual Indicators

| Status | Color | Condition |
|--------|-------|-----------|
| Unactivated | Blinking yellow/gold | 0 activations |
| Low | Red | 1-4 activations |
| Medium-Low | Orange | 5-14 activations |
| Medium | Yellow | 15-29 activations |
| Medium-High | Light Green | 30-49 activations |
| High | Green | 50-99 activations |
| Very High | Dark Green | 100+ activations |

## Tech Stack

### Frontend
- **Astro** - Static site generator
- **Leaflet.js** - Map library
- **OpenStreetMap** - Free map tiles
- **Leaflet.markercluster** - Marker clustering for performance

### Backend
- **Cloudflare Workers** - API proxy with caching
- **Cloudflare KV** - Data caching

## Project Structure

```
better-pota/
├── src/
│   ├── components/
│   │   ├── Map.astro
│   │   └── RegionSelector.astro
│   ├── scripts/
│   │   ├── api.js
│   │   ├── map.js
│   │   └── markers.js
│   ├── styles/
│   │   └── global.css
│   └── pages/
│       └── index.astro
├── workers/
│   └── api-worker/
│       ├── src/
│       │   └── index.ts
│       ├── wrangler.toml
│       └── package.json
├── public/
│   └── 404.html
├── astro.config.mjs
└── package.json
```

## Development

### Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

### Worker Setup

1. Navigate to the worker directory:
   ```bash
   cd workers/api-worker
   ```

2. Install Wrangler (Cloudflare Workers CLI):
   ```bash
   npm install -g wrangler
   ```

3. Deploy the worker:
   ```bash
   npm run deploy
   ```

## Deployment

### Frontend (GitHub Pages)

1. Push the project to a GitHub repository
2. Configure GitHub Pages to deploy from the `dist` directory
3. The site will be available at `https://your-username.github.io/better-pota`

### Backend (Cloudflare Workers)

1. Set up a Cloudflare account
2. Create a KV namespace for caching
3. Deploy the worker using Wrangler
4. Update the API base URL in the frontend to point to your worker

## API Endpoints

The Cloudflare Worker provides the following endpoints:

- `GET /park/{reference}/info` - Park information
- `GET /park/{reference}/stats` - Park statistics
- `GET /park/{reference}/data` - Combined park data
- `GET /location/{location}/parks` - Parks by region
- `GET /spot/activator` - Live spots
- `GET /health` - Health check

## Data Sources

- **POTA API** (`api.pota.app`) - Unofficial public API for park data
- **OpenStreetMap** - Free map tiles

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
