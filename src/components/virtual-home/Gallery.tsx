import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVirtualHome } from "@/hooks/useVirtualHome";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, X, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Gallery = () => {
  const { galleryItems, loading, deleteFromGallery } = useVirtualHome();
  const [selectedImage, setSelectedImage] = useState<typeof galleryItems[0] | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    );
  }

  if (galleryItems.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-6xl mb-4">🎨</div>
        <h3 className="text-xl font-bold mb-2">Галерея пуста</h3>
        <p className="text-muted-foreground">
          Создавай рисунки в разделе "Творчество" и они появятся здесь!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Мои работы ({galleryItems.length})</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {galleryItems.map((item) => (
          <Card
            key={item.id}
            className="group relative overflow-hidden cursor-pointer"
            onClick={() => setSelectedImage(item)}
          >
            <div className="aspect-square">
              <img
                src={item.image_data}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button size="icon" variant="secondary">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить работу?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие нельзя отменить. Работа будет удалена из галереи.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteFromGallery(item.id)}
                    >
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Title */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-white text-sm truncate">{item.title}</p>
              <p className="text-white/70 text-xs">
                {item.category === "drawing" ? "🖌️ Рисунок" : "🎨 Раскраска"}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Full Image Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedImage?.title}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage.image_data}
                alt={selectedImage.title}
                className="w-full rounded-lg"
              />
              <p className="text-center text-sm text-muted-foreground mt-2">
                {new Date(selectedImage.created_at).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
