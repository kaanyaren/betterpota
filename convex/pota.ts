import { query, mutation, httpAction } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Cache structure for POTA data
export const getParks = query({
  args: {},
  handler: async (ctx) => {
    // Try to get cached parks first
    const cachedParks = await ctx.db
      .query("parks")
      .order("desc")
      .first();

    // If we have recent cached data, return it
    if (cachedParks && Date.now() - cachedParks._creationTime < 24 * 60 * 60 * 1000) {
      console.log("Returning cached parks");
      return cachedParks.parks;
    }

    // Otherwise fetch fresh data
    console.log("Fetching fresh parks data from POTA API");
    try {
      const response = await fetch("https://api.pota.app/parks");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const parks = await response.json();

      // Cache the data
      await ctx.db.insert("parks", {
        parks: parks,
        _creationTime: Date.now(),
      });

      return parks;
    } catch (error) {
      console.error("Error fetching parks from POTA API:", error);
      // Return cached data even if stale, or empty array
      return cachedParks?.parks || [];
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
  handler: async (ctx) => {
    const parks = await ctx.db
      .query("parksWithStats")
      .order("desc")
      .first();

    // Return cached data if recent
    if (parks && Date.now() - parks._creationTime < 6 * 60 * 60 * 1000) {
      console.log("Returning cached parks with stats");
      return parks.parks;
    }

    // Otherwise fetch fresh data
    console.log("Fetching parks and stats from POTA API");
    try {
      // Get all parks
      const parksResponse = await fetch("https://api.pota.app/parks");
      if (!parksResponse.ok) {
        throw new Error(`HTTP error! status: ${parksResponse.status}`);
      }
      const allParks = await parksResponse.json();

      // Get stats for first 200 parks (for performance)
      const parksWithStats = [];
      const sampleParks = allParks.slice(0, 200);
      
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

      // Cache the enriched data
      await ctx.db.insert("parksWithStats", {
        parks: parksWithStats,
        _creationTime: Date.now(),
      });

      return parksWithStats;
    } catch (error) {
      console.error("Error fetching parks with stats:", error);
      return parks?.parks || [];
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