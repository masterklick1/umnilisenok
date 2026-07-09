let cancelled = false;
    startGeoWatch();

    const checkSmartPlaces = async (lat: number, lng: number) => {
      const s = settingsRef.current;
      if (s && !s.geofence_enabled) return;

      const places = placesRef.current;
      if (!places.length) {
        const s = settingsRef.current;
        if (s?.geofence_enabled && s.geofence_lat != null && s.geofence_lng != null) {
          const radius = s.geofence_radius_m || 300;
          const d = distanceM(lat, lng, s.geofence_lat, s.geofence_lng);
          const inside = d <= radius;
          const key = "legacy";
          const prev = insideMapRef.current.get(key);
          if (prev !== undefined && prev === inside) return;
          insideMapRef.current.set(key, inside);
          if (prev === undefined) return;
          await supabase.from("geofence_events").insert({
            child_id: childId,
            event_type: inside ? "enter" : "exit",
            latitude: lat,
            longitude: lng,
            distance_m: d,
            place_name: "Безопасная зона",
          });
          supabase.functions
            .invoke("notify-geofence", {
              body: {
                event_type: inside ? "enter" : "exit",
                distance_m: d,
                place_name: "Безопасная зона",
              },
            })
            .catch(() => {});
        }
        return;
      }

      const result = evaluateSmartPlaces(lat, lng, places, insideMapRef.current);
      
      emitChildPlaceStatus(result.statusMessage);
      
      await upsertPlaceStatus(childId, {
        current_place_id: result.currentPlace?.id ?? null,
        current_place_name: result.currentPlace?.name ?? null,
        status: result.status,
        target_place_id: result.targetPlace?.id ?? null,
        target_place_name: result.targetPlace?.name ?? null,
        status_message: result.statusMessage,
        latitude: lat,
        longitude: lng,
      });
    }; // <-- Скобка восстановлена, теперь синтаксис идеален
