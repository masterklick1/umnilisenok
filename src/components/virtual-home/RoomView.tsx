import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useVirtualHome, UserRoomItem } from "@/hooks/useVirtualHome";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPetStage } from "@/lib/pet-growth";

interface Drawing {
  id: string;
  title: string | null;
  image_data: string;
}

const FRAME_COLORS = ["border-amber-700", "border-rose-400", "border-emerald-500"];
const GOLD = ["border-yellow-400", "border-amber-400", "border-yellow-500"];
const RAINBOW = ["border-red-400", "border-sky-400", "border-violet-400"];

export const RoomView = () => {
  const { userPet, userRoomItems, loading } = useVirtualHome();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [zoom, setZoom] = useState<Drawing | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("gallery_items")
        .select("id, title, image_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (data) setDrawings(data as Drawing[]);
    })();
  }, []);

  const frameIcons = userRoomItems.filter((i) => i.room_items?.category === "frame").map((i) => i.room_items?.icon);
  const frames = frameIcons.includes("🌈") ? RAINBOW : frameIcons.includes("🖼️") ? GOLD : FRAME_COLORS;
  const furniture = userRoomItems.filter((i) => i.room_items?.category !== "frame");

  if (loading) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  return (
    <div className="relative w-full min-h-[420px] rounded-3xl p-6 bg-gradient-to-b from-sky-100 via-indigo-50 to-amber-50 border-4 border-indigo-100/80 shadow-inner flex flex-col justify-between overflow-hidden">
      {/* Обои/Узоры на заднем фоне */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Верхняя панель: Статус питомца */}
      <div className="relative z-10 flex items-center justify-between">
        {userPet ? (
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-white shadow-sm">
            <span className="text-2xl">{userPet.pets?.icon || "🐾"}</span>
            <div>
              <p className="font-bold text-xs sm:text-sm text-gray-800">{userPet.pet_name}</p>
              <div className="flex items-center gap-1 text-[10px] text-rose-500 font-semibold">
                <Heart className="w-3 h-3 fill-rose-500" />
                <span>{userPet.happiness}% счастья</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-100/80 text-amber-800 text-xs font-medium px-3 py-1.5 rounded-full border border-amber-200">
            Заведите питомца в магазине! 🐾
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-100/80 px-3 py-1.5 rounded-full font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Предметов: {userRoomItems.length}</span>
        </div>
      </div>

      {/* Рисунки ребёнка в рамках на стене */}
      <div className="relative z-10 flex justify-center gap-4 mt-4">
        {drawings.length > 0 ? (
          drawings.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setZoom(zoom?.id === d.id ? null : d)}
              className={`bg-white p-1 border-[6px] ${frames[i % 3]} ${frames !== FRAME_COLORS ? "border-8 shadow-lg" : ""} rounded-sm shadow-md transition-transform hover:scale-105 ${i % 2 ? "rotate-2" : "-rotate-2"}`}
              aria-label={d.title || "Рисунок"}
            >
              <img src={d.image_data} alt={d.title || "Рисунок"} className="w-16 h-16 sm:w-20 sm:h-20 object-cover" />
            </button>
          ))
        ) : (
          <div className="border-4 border-dashed border-amber-300 rounded-sm px-3 py-2 text-[11px] text-amber-700 bg-white/50">
            🖼️ Нарисуй картину в «Творчестве» — она повиснет здесь!
          </div>
        )}
      </div>
      {zoom && (
        <button onClick={() => setZoom(null)} className="relative z-20 mx-auto mt-3 block bg-white p-2 border-8 border-amber-700 rounded shadow-xl">
          <img src={zoom.image_data} alt={zoom.title || "Рисунок"} className="max-h-64 object-contain" />
        </button>
      )}

      {/* Центр комнаты: Питомец */}
      <div className="relative z-10 flex flex-col items-center justify-center my-8">
        {userPet ? (
          <div className="group relative cursor-pointer">
            <div className={`${getPetStage(userPet.adopted_at).scale}`}><div className="text-8xl sm:text-9xl filter drop-shadow-xl transition-transform hover:scale-110 duration-300 animate-bounce-gentle">
              {userPet.pets?.icon || "🐾"}
            </div></div>
            <p className="text-center text-xs font-bold text-indigo-700 mt-1">{getPetStage(userPet.adopted_at).label}</p>
            <div className="w-24 h-4 bg-black/10 rounded-full blur-sm mx-auto mt-2" />
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-4xl mb-2">🏠</p>
            <p className="text-gray-500 text-sm">Ваша комната пока пуста</p>
          </div>
        )}
      </div>

      {/* Нижняя часть комнаты: Мебель и предметы */}
      <div className="relative z-10 border-t border-indigo-100/60 pt-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">Мебель в комнате:</p>
        {furniture.length > 0 ? (
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {furniture.map((item: UserRoomItem, idx: number) => (
              <Card
                key={item.id || idx}
                className="p-3 min-w-[70px] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm border-indigo-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="text-3xl">{item.room_items?.icon || "📦"}</span>
                <span className="text-[10px] font-medium text-gray-600 mt-1 truncate max-w-[60px]">
                  {item.room_items?.name}
                </span>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic bg-white/40 p-3 rounded-xl border border-dashed border-gray-300 text-center">
            Купите мебель в магазине, чтобы украсить комнату! ✨
          </div>
        )}
      </div>
    </div>
  );
};
