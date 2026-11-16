import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteDrawing, listDrawings, useGalleryOwner, type Drawing } from "@/lib/drawing-gallery";

export function Gallery() {
  const { t } = useLanguage();
  const owner = useGalleryOwner();
  if (!owner) return <p role="status">{t("Загружаем галерею…", "Loading gallery…")}</p>;
  return <GalleryContents key={owner.id} ownerId={owner.id} local={owner.local} />;
}

function GalleryContents({ ownerId, local }: { ownerId: string; local: boolean }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<Drawing[] | null>(null);
  const [selected, setSelected] = useState<Drawing | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeFailed, setRemoveFailed] = useState(false);

  useEffect(() => {
    let active = true;
    listDrawings({ id: ownerId, local }).then((drawings) => {
      if (active) setItems(drawings);
    }).catch(() => {
      if (active) setLoadFailed(true);
    });
    return () => { active = false; };
  }, [ownerId, local, attempt]);

  const remove = async () => {
    if (!selected || removing || !window.confirm(t("Удалить этот рисунок из галереи?", "Remove this drawing from the gallery?"))) return;
    setRemoving(true);
    setRemoveFailed(false);
    try {
      await deleteDrawing({ id: ownerId, local }, selected.id);
      setItems((drawings) => drawings?.filter(({ id }) => id !== selected.id) ?? []);
      setSelected(null);
    } catch {
      setRemoveFailed(true);
    } finally {
      setRemoving(false);
    }
  };

  if (loadFailed) return (
    <Card className="space-y-3 p-6 text-center">
      <p role="status">{t("Не удалось открыть галерею.", "Couldn’t open the gallery.")}</p>
      <Button onClick={() => { setLoadFailed(false); setAttempt((value) => value + 1); }}>{t("Попробовать ещё раз", "Try again")}</Button>
    </Card>
  );
  if (!items) return <p role="status">{t("Загружаем галерею…", "Loading gallery…")}</p>;
  if (!items.length) return <Card className="p-6 text-center">{t("Здесь появятся рисунки, которые ты сохранишь в «Творчестве».", "Pictures you save in Arts and crafts will appear here.")}</Card>;

  return (
    <>
      {local && <p className="mb-3 text-sm text-muted-foreground">{t("Рисунки сохранены на этом устройстве.", "Your pictures are saved on this device.")}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => { setRemoveFailed(false); setSelected(item); }}
            className="overflow-hidden rounded-2xl border bg-card text-left hover:border-primary focus-visible:outline focus-visible:outline-primary">
            <img src={item.image_data} alt="" loading="lazy" className="aspect-square w-full bg-white object-contain" />
            <span className="block truncate p-3 text-sm font-medium">{item.title}</span>
          </button>
        ))}
      </div>
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open && !removing) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.title || t("Рисунок", "Drawing")}</DialogTitle>
            <DialogDescription>{t("Работа из галереи", "Picture from the gallery")}</DialogDescription>
          </DialogHeader>
          {selected && <img src={selected.image_data} alt={selected.title} className="mx-auto max-h-[60vh] w-full rounded-xl bg-white object-contain" />}
          {removeFailed && <p role="status">{t("Не удалось удалить рисунок. Попробуй ещё раз.", "Couldn’t remove the drawing. Try again.")}</p>}
          <Button variant="outline" onClick={() => void remove()} disabled={removing}>{removing ? t("Удаляем…", "Removing…") : t("Удалить рисунок", "Remove drawing")}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
