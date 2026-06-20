import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

const STICKERS = [
  "🦊", "🐱", "🐶", "🐰", "🐻", "🦄", "🐸", "🐥",
  "🌳", "🌸", "🌻", "🍄", "⭐", "🌈", "☀️", "🌙",
  "🍎", "🍓", "🍦", "🎈", "🎁", "🚗", "🚀", "⚽",
  "❤️", "🦋", "🐝", "🐠",
];

interface PlacedSticker {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

export const StickerBoard = () => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(STICKERS[0]);
  const [placed, setPlaced] = useState<PlacedSticker[]>([]);
  const nextId = useRef(0);

  const handleBoardClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setPlaced((prev) => [...prev, { id: nextId.current++, emoji: selected, x, y }]);
  };

  const handleUndo = () => setPlaced((prev) => prev.slice(0, -1));
  const handleClear = () => {
    setPlaced([]);
    toast.success("Полотно очищено!");
  };

  return (
    <div className="flex flex-col gap-5 items-center">
      <div className="text-center">
        <h3 className="text-2xl font-extrabold mb-1">Наклейки</h3>
        <p className="text-muted-foreground">Выбери наклейку и нажимай на полотно!</p>
      </div>

      {/* Sticker palette */}
      <div className="flex flex-wrap justify-center gap-2 max-w-xl">
        {STICKERS.map((s) => (
          <button
            key={s}
            onClick={() => setSelected(s)}
            className={`text-3xl w-12 h-12 rounded-2xl transition-all ${
              selected === s
                ? "bg-primary/20 ring-2 ring-primary scale-110"
                : "bg-muted hover:bg-primary/10"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        onClick={handleBoardClick}
        onTouchStart={handleBoardClick}
        className="relative w-full max-w-2xl aspect-[3/2] rounded-3xl border-4 border-primary/20 shadow-xl overflow-hidden cursor-pointer touch-none bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-100"
      >
        {placed.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/60 text-lg font-medium pointer-events-none">
            Нажми сюда, чтобы поставить {selected}
          </div>
        )}
        {placed.map((p) => (
          <span
            key={p.id}
            className="absolute text-4xl sm:text-5xl -translate-x-1/2 -translate-y-1/2 select-none animate-pop-in"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      <div className="flex gap-3">
        <Button size="lg" variant="outline" onClick={handleUndo} disabled={placed.length === 0}>
          <Undo2 className="w-5 h-5 mr-2" />
          Отменить
        </Button>
        <Button size="lg" variant="destructive" onClick={handleClear} disabled={placed.length === 0}>
          <Trash2 className="w-5 h-5 mr-2" />
          Очистить
        </Button>
      </div>
    </div>
  );
};
