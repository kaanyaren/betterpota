import { httpAction } from "./_generated/server";

export const testHttp = httpAction(async (ctx, request) => {
  return new Response(JSON.stringify({ message: "Convex is working!" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
});