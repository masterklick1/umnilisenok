// Places API (New) proxy — держит серверный ключ на сервере, чтобы native-клиент
// (Capacitor WebView) не нёс referrer-restricted browser-key.
// Действия: autocomplete | textsearch | details

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

interface AutocompleteBody {
  action: "autocomplete";
  input: string;
  sessionToken?: string;
  location?: { lat: number; lng: number };
  radius?: number;
  language?: string;
  region?: string;
}
interface TextSearchBody {
  action: "textsearch";
  input: string;
  location?: { lat: number; lng: number };
  radius?: number;
  language?: string;
  region?: string;
}
interface DetailsBody {
  action: "details";
  placeId: string;
  language?: string;
}

type Body = AutocompleteBody | TextSearchBody | DetailsBody;

const PLACES_HOST = "https://places.googleapis.com/v1";

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

  try {
    if (body.action === "autocomplete") {
      if (!body.input || body.input.trim().length < 2) {
        return jsonResponse({ suggestions: [] });
      }
      const payload: Record<string, unknown> = {
        input: body.input.trim(),
        languageCode: body.language ?? "ru",
        regionCode: body.region ?? "RU",
      };
      if (body.sessionToken) payload.sessionToken = body.sessionToken;
      if (body.location) {
        payload.locationBias = {
          circle: {
            center: { latitude: body.location.lat, longitude: body.location.lng },
            radius: Math.min(body.radius ?? 20000, 50000),
          },
        };
      }

      const res = await fetch(`${PLACES_HOST}/places:autocomplete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error("places autocomplete failed", res.status, text);
        return jsonResponse({ error: "Places API error", status: res.status, details: text }, res.status);
      }
      const json = JSON.parse(text) as {
        suggestions?: Array<{
          placePrediction?: {
            placeId: string;
            text?: { text: string };
            structuredFormat?: {
              mainText?: { text: string };
              secondaryText?: { text: string };
            };
          };
        }>;
      };
      const suggestions = (json.suggestions ?? [])
        .map((s) => s.placePrediction)
        .filter(Boolean)
        .map((p) => ({
          placeId: p!.placeId,
          text: p!.text?.text ?? p!.structuredFormat?.mainText?.text ?? "",
          mainText: p!.structuredFormat?.mainText?.text ?? "",
          secondaryText: p!.structuredFormat?.secondaryText?.text ?? "",
        }));
      return jsonResponse({ suggestions });
    }

    if (body.action === "textsearch") {
      if (!body.input || body.input.trim().length < 2) {
        return jsonResponse({ results: [] });
      }
      const payload: Record<string, unknown> = {
        textQuery: body.input.trim(),
        languageCode: body.language ?? "ru",
        regionCode: body.region ?? "RU",
      };
      if (body.location) {
        payload.locationBias = {
          circle: {
            center: { latitude: body.location.lat, longitude: body.location.lng },
            radius: Math.min(body.radius ?? 20000, 50000),
          },
        };
      }
      const res = await fetch(`${PLACES_HOST}/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error("places textsearch failed", res.status, text);
        return jsonResponse({ error: "Places API error", status: res.status, details: text }, res.status);
      }
      const json = JSON.parse(text) as {
        places?: Array<{
          id: string;
          displayName?: { text: string };
          formattedAddress?: string;
          location?: { latitude: number; longitude: number };
        }>;
      };
      const results = (json.places ?? []).map((p) => ({
        placeId: p.id,
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? "",
        lat: p.location?.latitude ?? 0,
        lng: p.location?.longitude ?? 0,
      }));
      return jsonResponse({ results });
    }

    if (body.action === "details") {
      if (!body.placeId) return jsonResponse({ error: "placeId required" }, 400);
      const res = await fetch(
        `${PLACES_HOST}/places/${encodeURIComponent(body.placeId)}?languageCode=${body.language ?? "ru"}`,
        {
          headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
          },
        },
      );
      const text = await res.text();
      if (!res.ok) {
        console.error("places details failed", res.status, text);
        return jsonResponse({ error: "Places API error", status: res.status, details: text }, res.status);
      }
      const p = JSON.parse(text) as {
        id: string;
        displayName?: { text: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
      };
      return jsonResponse({
        placeId: p.id,
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? "",
        lat: p.location?.latitude ?? 0,
        lng: p.location?.longitude ?? 0,
      });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("places-proxy error", e);
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
