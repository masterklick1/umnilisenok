import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Wifi } from "lucide-react";

interface RoomItem {
  id: string;
  name: string;
  category: string;
  icon: string;
}

interface UserRoomItem {
  id: string;
  position_x: number;
  position_y: number;
  is_placed: boolean;
  room_items: RoomItem;
}

interface UserPet {
  id: string;
  pet_name: string;
  happiness: number;
  hunger: number;
  energy: number;
  pets: { name: string; icon: string };
}

interface Props {
  childId: string;
  childName: string;
}

const wallpaperStyle = (icon?: string) => {
  switch (icon) {
    case "🔵": return "bg-gradient-to-b from-blue-200 to-blue-100";
    case "🩷": return "bg-gradient-to-b from-pink-200 to-pink-100";
    case "🟢": return "bg-gradient-to-b from-green-200 to-green-100";
    case "🟡": return "bg-gradient-to-b from-yellow-200 to-yellow-100";
    case "🟣": return "bg-gradient-to-b from-purple-200 to-purple-100";
    case "🌌": return "bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-800";
    default: return "bg-gradient-to-b from-sky-200 to-sky-100";
  }
};

const floorStyle = (icon?: string) => {
  switch (icon) {
    case "🟫": return "bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700";
    case "🟪": return "bg-gradient-to-r from-purple-300 via-purple-200 to-purple-300";
    case "🟩": return "bg-gradient-to-r from-green-400 via-green-300 to-green-400";
    case "⭐": return "bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700";
    default: return "bg-amber-200";
  }
};

export const ChildRoomViewer = ({ childId, childName }: Props) => {
  const [items, setItems] = useState<UserRoomItem[]>([]);
  const [pet, setPet] = useState<UserPet | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: roomData }, { data: petData }] = await Promise.all([
      supabase
        .from("user_room_items")
        .select("id, position_x, position_y, is_placed, room_items(id, name, category, icon)")
        .eq("user_id", childId),
      supabase
        .from("user_pets")
        .select("id, pet_name, happiness, hunger, energy, pets(name, icon)")
        .eq("user_id", childId)
        .maybeSingle(),
    ]);
    setItems((roomData as unknown as UserRoomItem[]) || []);
    setPet((petData as unknown as UserPet) || null);
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    fetchData();

    const channel = supabase
      .channel(`child-room-${childId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_room_items", filter: `user_id=eq.${childId}` },
        () => {
          setPulse(true);
          fetchData().finally(() => setTimeout(() => setPulse(false), 800));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_pets", filter: `user_id=eq.${childId}` },
        () => {
          setPulse(true);
          fetchData().finally(() => setTimeout(() => setPulse(false), 800));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId, fetchData]);

  if (loading) {
    return <Skeleton className="h-80 w-full" />;
  }

  const placed = items.filter((i) => i.is_placed);
  const wallpaper = placed.find((i) => i.room_items.category === "wallpaper");
  const floor = placed.find((i) => i.room_items.category === "floor");
  const decorations = placed.filter(
    (i) => i.room_items.category !== "wallpaper" && i.room_items.category !== "floor"
  );
  const inventory = items.filter((i) => !i.is_placed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">🏠 Комната: {childName}</h3>
        <span className={`flex items-center gap-1 text-xs ${pulse ? "text-primary" : "text-muted-foreground"} transition-colors`}>
          <Wifi className={`w-4 h-4 ${pulse ? "animate-pulse" : ""}`} />
          {pulse ? "Обновление…" : "В реальном времени"}
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className={`relative h-80 ${wallpaperStyle(wallpaper?.room_items.icon)} transition-colors duration-500`}>
          {wallpaper?.room_items.icon === "🌌" && (
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    top: `${(i * 17) % 60}%`,
                    animationDelay: `${(i % 4) * 0.3}s`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-20 bg-sky-300 rounded-t-full border-4 border-amber-700 shadow-lg">
            <div className="absolute inset-2 bg-sky-400 rounded-t-full" />
          </div>

          <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 p-4 pt-28">
            {decorations.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-center text-4xl"
                style={{
                  gridColumn: item.position_x + 1,
                  gridRow: item.position_y + 1,
                }}
                title={item.room_items.name}
              >
                {item.room_items.icon}
              </div>
            ))}
          </div>

          {pet && (
            <div className="absolute bottom-16 right-8 text-5xl animate-bounce">
              {pet.pets.icon}
            </div>
          )}

          <div className={`absolute bottom-0 left-0 right-0 h-12 ${floorStyle(floor?.room_items.icon)}`}>
            <div className="absolute inset-0 opacity-30 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">Размещено / в инвентаре</p>
            <p className="text-2xl font-bold">{placed.length} / {inventory.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">Питомец</p>
            {pet ? (
              <p className="text-sm">
                <span className="text-2xl mr-2">{pet.pets.icon}</span>
                {pet.pet_name} · ❤️{pet.happiness}% 🍎{pet.hunger}% ⚡{pet.energy}%
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Питомца нет</p>
            )}
          </CardContent>
        </Card>
      </div>

      {inventory.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">В инвентаре, не размещено:</p>
            <div className="flex flex-wrap gap-2">
              {inventory.map((i) => (
                <div key={i.id} className="px-2 py-1 bg-muted rounded text-sm flex items-center gap-1">
                  <span className="text-lg">{i.room_items.icon}</span>
                  <span className="text-xs">{i.room_items.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
