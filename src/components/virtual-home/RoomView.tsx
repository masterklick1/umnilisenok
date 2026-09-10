import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVirtualHome, UserRoomItem } from "@/hooks/useVirtualHome";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Heart } from "lucide-react";

export const RoomView = () => {
  const { userPet, userRoomItems, loading } = useVirtualHome();

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

      {/* Центр комнаты: Питомец */}
      <div className="relative z-10 flex flex-col items-center justify-center my-8">
        {userPet ? (
          <div className="group relative cursor-pointer">
            <div className="text-8xl sm:text-9xl filter drop-shadow-xl transition-transform hover:scale-110 duration-300 animate-bounce-gentle">
              {userPet.pets?.icon || "🐾"}
            </div>
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
        {userRoomItems.length > 0 ? (
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {userRoomItems.map((item: UserRoomItem, idx: number) => (
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
