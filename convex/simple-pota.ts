import { query, httpAction } from "./_generated/server";
import { api } from "./_generated/api";

export const getSimpleParks = query({
  args: {},
  handler: async () => {
    console.log("Fetching parks from POTA API...");
    try {
      const response = await fetch("https://api.pota.app/parks");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const parks = await response.json();
      
      // Return first 50 parks with basic info
      return parks.slice(0, 50).map(park => ({
        reference: park.reference,
        name: park.name,
        latitude: park.latitude,
        longitude: park.longitude,
        grid: park.grid,
        parktype: park.parktype,
        activations: 0, // Default for now
        qsos: 0
      }));
    } catch (error) {
      console.error("Error fetching parks:", error);
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
        }
      ];
    }
  },
});

export const getSimpleParksHttp = httpAction(async (ctx, request) => {
  const parks = await ctx.runQuery(api.simplePota.getSimpleParks);
  
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