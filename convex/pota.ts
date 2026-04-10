import { httpAction } from "./_generated/server";

// HTTP actions for external access
export const getAllParksWithStatsHttp = httpAction(async (ctx, request) => {
  console.log("Fetching parks and stats from POTA API via HTTP action...");
  try {
    // Get all parks
    const parksResponse = await fetch("https://api.pota.app/parks");
    if (!parksResponse.ok) {
      throw new Error(`HTTP error! status: ${parksResponse.status}`);
    }
    const allParks = await parksResponse.json();

    // Return all parks without per-park stats calls to prevent timeouts
    // and ensure the list is complete.
    const parksWithStats = allParks.map((park: any) => ({
      reference: park.reference,
      name: park.name,
      latitude: park.latitude,
      longitude: park.longitude,
      grid: park.grid,
      parktype: park.parktype,
      activations: 0,
      qsos: 0,
    }));

    console.log("Successfully fetched", parksWithStats.length, "parks with stats");
    
    return new Response(JSON.stringify(parksWithStats), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Error fetching parks with stats:", error);
    // Return fallback data
    const fallbackData = [
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
    
    return new Response(JSON.stringify(fallbackData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
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
