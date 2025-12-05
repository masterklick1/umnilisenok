import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVirtualHome } from "@/hooks/useVirtualHome";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";

export const RoomView = () => {
  const { userRoomItems, loading, placeItem, removeItem, userPet } = useVirtualHome();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  
  const placedItems = userRoomItems.filter((item) => item.is_placed);
  const inventoryItems = userRoomItems.filter((item) => !item.is_placed);

  // Get wallpaper and floor
  const wallpaper = placedItems.find((item) => item.room_items.category === "wallpaper");
  const floor = placedItems.find((item) => item.room_items.category === "floor");
  const decorations = placedItems.filter(
    (item) => item.room_items.category !== "wallpaper" && item.room_items.category !== "floor"
  );

  const getWallpaperStyle = () => {
    if (!wallpaper) return "bg-gradient-to-b from-sky-200 to-sky-100";
    const icon = wallpaper.room_items.icon;
    if (icon === "🔵") return "bg-gradient-to-b from-blue-200 to-blue-100";
    if (icon === "🩷") return "bg-gradient-to-b from-pink-200 to-pink-100";
    if (icon === "🟢") return "bg-gradient-to-b from-green-200 to-green-100";
    if (icon === "🌌") return "bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-800";
    return "bg-gradient-to-b from-sky-200 to-sky-100";
  };

  const getFloorStyle = () => {
    if (!floor) return "bg-amber-200";
    const icon = floor.room_items.icon;
    if (icon === "🟫") return "bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700";
    if (icon === "🟪") return "bg-gradient-to-r from-purple-300 via-purple-200 to-purple-300";
    if (icon === "🟩") return "bg-gradient-to-r from-green-400 via-green-300 to-green-400";
    return "bg-amber-200";
  };

  const handleCellClick = (x: number, y: number) => {
    if (selectedItem) {
      placeItem(selectedItem, x, y);
      setSelectedItem(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Room Display */}
      <Card className="overflow-hidden">
        <div className={`relative h-80 ${getWallpaperStyle()} transition-colors duration-500`}>
          {/* Stars for night wallpaper */}
          {wallpaper?.room_items.icon === "🌌" && (
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 60}%`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Window */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-20 bg-sky-300 rounded-t-full border-4 border-amber-700 shadow-lg">
            <div className="absolute inset-2 bg-sky-400 rounded-t-full">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-full bg-amber-700" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-amber-700" />
            </div>
          </div>

          {/* Decorations Grid */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 p-4 pt-28">
            {decorations.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-center text-4xl cursor-pointer hover:scale-110 transition-transform group relative"
                style={{
                  gridColumn: item.position_x + 1,
                  gridRow: item.position_y + 1,
                }}
                onClick={() => removeItem(item.id)}
              >
                {item.room_items.icon}
                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </div>
              </div>
            ))}
          </div>

          {/* Pet in room */}
          {userPet && (
            <div className="absolute bottom-16 right-8 text-5xl animate-bounce-gentle">
              {userPet.pets.icon}
            </div>
          )}

          {/* Floor */}
          <div className={`absolute bottom-0 left-0 right-0 h-12 ${getFloorStyle()}`}>
            <div className="absolute inset-0 opacity-30 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        </div>
      </Card>

      {/* Placement Grid when item selected */}
      {selectedItem && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-3">Выбери место для предмета:</p>
          <div className="grid grid-cols-6 grid-rows-3 gap-2">
            {[...Array(18)].map((_, i) => {
              const x = i % 6;
              const y = Math.floor(i / 6);
              return (
                <Button
                  key={i}
                  variant="outline"
                  className="h-12 hover:bg-primary/20"
                  onClick={() => handleCellClick(x, y)}
                >
                  {x + 1},{y + 1}
                </Button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => setSelectedItem(null)}
          >
            Отмена
          </Button>
        </Card>
      )}

      {/* Inventory */}
      <Card className="p-4">
        <h3 className="font-bold text-lg mb-4">📦 Мои вещи</h3>
        {inventoryItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            У тебя пока нет вещей. Загляни в магазин! 🛍️
          </p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {inventoryItems.map((item) => (
              <Button
                key={item.id}
                variant={selectedItem === item.id ? "default" : "outline"}
                className="h-16 flex flex-col gap-1"
                onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
              >
                <span className="text-2xl">{item.room_items.icon}</span>
                <span className="text-xs truncate w-full">{item.room_items.name}</span>
              </Button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
