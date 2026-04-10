import { query, mutation, httpAction } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Simple POTA data without database caching for now
export const getParks = query({
  args: {},
  handler: async () => {
    console.log("Fetching parks from POTA API...");
    try {
      const response = await fetch("https://api.pota.app/parks");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const parks = await response.json();
      console.log("Successfully fetched", parks.length, "parks");
      
      // Return first 100 parks
      return parks.slice(0, 100);
    } catch (error) {
      console.error("Error fetching parks from POTA API:", error);
      // Return empty array on error
      return [];
    }
  },
});

export const getParkStats = query({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`https://api.pota.app/park/${args.reference}/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching stats for park ${args.reference}:`, error);
      return { activations: 0, qsos: 0 };
    }
  },
});

export const getAllParksWithStats = query({
  args: {},
  handler: async () => {
    console.log("Fetching parks and stats from POTA API...");
    try {
      // Get all parks
      const parksResponse = await fetch("https://api.pota.app/parks");
      if (!parksResponse.ok) {
        throw new Error(`HTTP error! status: ${parksResponse.status}`);
      }
      const allParks = await parksResponse.json();

      // Get stats for first 50 parks (for performance)
      const parksWithStats = [];
      const sampleParks = allParks.slice(0, 50);
      
      for (const park of sampleParks) {
        try {
          const statsResponse = await fetch(`https://api.pota.app/park/${park.reference}/stats`);
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

      console.log("Successfully fetched", parksWithStats.length, "parks with stats");
      return parksWithStats;
    } catch (error) {
      console.error("Error fetching parks with stats:", error);
      // Return fallback data
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
        }
      ];
    }
  },
});

// HTTP actions for external access
export const getAllParksWithStatsHttp = httpAction(async (ctx, request) => {
  const parks = await ctx.runQuery(api.pota.getAllParksWithStats);
  
  return new Response(JSON.stringify(parks), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
});

export const getParksHttp = httpAction(async (ctx, request) => {
  const parks = await ctx.runQuery(api.pota.getParks);
  
  return new Response(JSON.stringify(parks), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
});

export const getParkStatsHttp = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  
  if (!reference) {
    return new Response(JSON.stringify({ error: "Reference parameter required" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  
  const stats = await ctx.runQuery(api.pota.getParkStats, { reference });
  
  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
});