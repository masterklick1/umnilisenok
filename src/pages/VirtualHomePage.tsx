import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, Sparkles, Calendar, Trophy } from "lucide-react";

interface GalleryItem {
  id: string;
  image_url: string;
  title: string | null;
  created_at: string;
}

export const Gallery = () => {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);

  const { data: drawings = [], isLoading } = useQuery({
    queryKey: ["child-drawings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("drawings")
        .select("id, image_url, title, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Ошибка при загрузке галереи:", error);
        return [];
      }
      return data as GalleryItem[];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-6">
      {/* Шапка блока */}
      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl">
            <Image className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg">Моя Галерея</h2>
            <p className="text-xs text-muted-foreground">Твои рисунки и творческие достижения</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-purple-200">
          <Trophy className="w-3.5 h-3.5 text-purple-500" />
          <span>Всего: {drawings.length}</span>
        </div>
      </div>

      {/* Загрузка */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Пустая галерея */}
      {!isLoading && drawings.length === 0 && (
        <div className="text-center py-12 px-4 bg-white/60 rounded-3xl border border-dashed border-indigo-200">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🎨
          </div>
          <h3 className="text-base font-bold text-foreground">Пока нет сохранённых рисунков</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            Зайди в раздел «Творчество», нарисуй шедевр и сохрани его, чтобы он появился здесь!
          </p>
        </div>
      )}

      {/* Сетка рисунков */}
      {!isLoading && drawings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {drawings.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedImage(item)}
              className="group relative bg-white rounded-2xl overflow-hidden border border-indigo-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer aspect-square"
            >
              <img
                src={item.image_url}
                alt={item.title || "Рисунок"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 text-white">
                <span className="font-semibold text-xs truncate">
                  {item.title || "Мой рисунок"}
                </span>
                <span className="text-[10px] text-white/80 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка просмотра рисунка */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-xl rounded-3xl p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{selectedImage?.title || "Просмотр рисунка"}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden bg-slate-950/5 border border-slate-100 max-h-[70vh] flex items-center justify-center">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.title || "Рисунок"}
                  className="max-h-[65vh] w-auto object-contain rounded-xl"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Сохранено: {new Date(selectedImage.created_at).toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
