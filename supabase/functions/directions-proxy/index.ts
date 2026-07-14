// Directions proxy на Routes API v2 (legacy Directions API депрекейтед).
// Возвращает клиенту декодированный список [lat,lng] точек для polyline
// плюс общую длину/время.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Body {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  mode?: "driving" | "walking";
}

async function requireUser(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonResponse({ error: "Missing Authorization" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return jsonResponse({ error: "Unauthorized" }, 401);
  return { userId: data.user.id };
}

// Google polyline decoder (алгоритм из документации).
function decodePolyline(str: string): Array<{ lat: number; lng: number }> {
  let index = 0;
  const len = str.length;
  let lat = 0;
  let lng = 0;
  const path: Array<{ lat: number; lng: number }> = [];

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    path.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return path;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("GOOGLE_MAPS_SERVER_KEY");
  if (!apiKey) {
    return jsonResponse(
      { error: "GOOGLE_MAPS_SERVER_KEY is not configured on the server" },
      500,
    );
  }

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (
    !body?.origin ||
    !body?.destination ||
    typeof body.origin.lat !== "number" ||
    typeof body.origin.lng !== "number" ||
    typeof body.destination.lat !== "number" ||
    typeof body.destination.lng !== "number"
  ) {
    return jsonResponse({ error: "origin/destination required as {lat,lng}" }, 400);
  }

  const travelMode = body.mode === "walking" ? "WALK" : "DRIVE";
  const payload = {
    origin: {
      location: {
        latLng: { latitude: body.origin.lat, longitude: body.origin.lng },
      },
    },
    destination: {
      location: {
        latLng: { latitude: body.destination.lat, longitude: body.destination.lng },
      },
    },
    travelMode,
    polylineQuality: "OVERVIEW",
  };

  try {
    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify(payload),
      },
    );
    const text = await res.text();
    if (!res.ok) {
      console.error("Routes API failed", res.status, text);
      return jsonResponse(
        { error: "Routes API error", status: res.status, details: text },
        res.status,
      );
    }
    const json = JSON.parse(text) as {
      routes?: Array<{
        duration?: string;
        distanceMeters?: number;
        polyline?: { encodedPolyline?: string };
      }>;
    };
    const route = json.routes?.[0];
    if (!route?.polyline?.encodedPolyline) {
      return jsonResponse({ error: "No route found" }, 404);
    }
    return jsonResponse({
      path: decodePolyline(route.polyline.encodedPolyline),
      distanceMeters: route.distanceMeters ?? null,
      duration: route.duration ?? null,
    });
  } catch (e) {
    console.error("directions-proxy error", e);
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
