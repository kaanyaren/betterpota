// Cloudflare Worker for POTA API proxy with caching

interface ParkInfo {
  reference: string;
  name: string;
  latitude: number;
  longitude: number;
  grid: string;
  parktype: string;
}

interface ParkStats {
  reference: string;
  activations: number;
  qsos: number;
}

interface ParkData extends ParkInfo, ParkStats {}

const API_BASE_URL = 'https://api.pota.app';

// Cache configuration
const CACHE_TTL = {
  PARK_INFO: 24 * 60 * 60, // 24 hours
  PARK_STATS: 60 * 60,     // 1 hour
  LOCATION_PARKS: 60 * 60, // 1 hour
  LIVE_SPOTS: 60          // 1 minute
};

export interface Env {
  POTA_CACHE: KVNamespace;
}

// Helper function to generate cache key
function getCacheKey(endpoint: string, params: string = ''): string {
  return `pota:${endpoint}:${params}`;
}

// Helper function to fetch with error handling
async function fetchWithErrorHandling(url: string): Promise<Response> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Cache wrapper
async function cachedFetch(
  env: Env,
  cacheKey: string,
  url: string,
  ttl: number
): Promise<Response> {
  // Try to get from cache first
  const cached = await env.POTA_CACHE.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${ttl}`
      }
    });
  }

  // Fetch from API
  const response = await fetchWithErrorHandling(url);
  const data = await response.text();
  
  // Store in cache
  await env.POTA_CACHE.put(cacheKey, data, { expirationTtl: ttl });
  
  return new Response(data, {
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'Cache-Control': `public, max-age=${ttl}`
    }
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      // Route requests
      if (path.startsWith('/park/') && path.endsWith('/info')) {
        const reference = path.split('/')[2];
        const cacheKey = getCacheKey('park-info', reference);
        const apiUrl = `${API_BASE_URL}/park/${reference}/info`;
        return await cachedFetch(env, cacheKey, apiUrl, CACHE_TTL.PARK_INFO);
      }

      if (path.startsWith('/park/') && path.endsWith('/stats')) {
        const reference = path.split('/')[2];
        const cacheKey = getCacheKey('park-stats', reference);
        const apiUrl = `${API_BASE_URL}/park/${reference}/stats`;
        return await cachedFetch(env, cacheKey, apiUrl, CACHE_TTL.PARK_STATS);
      }

      if (path.startsWith('/location/') && path.endsWith('/parks')) {
        const location = path.split('/')[2];
        const cacheKey = getCacheKey('location-parks', location);
        const apiUrl = `${API_BASE_URL}/location/${location}/parks`;
        return await cachedFetch(env, cacheKey, apiUrl, CACHE_TTL.LOCATION_PARKS);
      }

      if (path === '/spot/activator') {
        const cacheKey = getCacheKey('live-spots');
        const apiUrl = `${API_BASE_URL}/spot/activator`;
        return await cachedFetch(env, cacheKey, apiUrl, CACHE_TTL.LIVE_SPOTS);
      }

      // Combined park data endpoint
      if (path.startsWith('/park/') && path.endsWith('/data')) {
        const reference = path.split('/')[2];
        const cacheKey = getCacheKey('park-data', reference);
        
        // Try cache first
        const cached = await env.POTA_CACHE.get(cacheKey);
        if (cached) {
          return new Response(cached, {
            headers: {
              'Content-Type': 'application/json',
              'X-Cache': 'HIT',
              'Cache-Control': `public, max-age=${CACHE_TTL.PARK_STATS}`,
              ...corsHeaders
            }
          });
        }

        // Fetch combined data
        const [infoResponse, statsResponse] = await Promise.all([
          fetchWithErrorHandling(`${API_BASE_URL}/park/${reference}/info`),
          fetchWithErrorHandling(`${API_BASE_URL}/park/${reference}/stats`)
        ]);

        const info: ParkInfo = await infoResponse.json();
        const stats: ParkStats = await statsResponse.json();

        const combinedData: ParkData = {
          ...info,
          ...stats
        };

        const data = JSON.stringify(combinedData);
        await env.POTA_CACHE.put(cacheKey, data, { 
          expirationTtl: CACHE_TTL.PARK_STATS 
        });

        return new Response(data, {
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'MISS',
            'Cache-Control': `public, max-age=${CACHE_TTL.PARK_STATS}`,
            ...corsHeaders
          }
        });
      }

      // Health check endpoint
      if (path === '/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Not found
      return new Response('Not found', { 
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), 
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
  }
};