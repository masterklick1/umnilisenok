import { useLanguage } from "@/contexts/LanguageContext";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ColorPalette } from "./ColorPalette";
import { ChevronLeft, ChevronRight, Images, RotateCcw, Save } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveDrawing, useGalleryOwner, type Drawing } from "@/lib/drawing-gallery";
import { NUMBERED_COLORINGS, type NumberedColoring } from "./numbered-coloring";
import { COLORING_SCENES, type ColoringImage } from "./coloring-scenes";

const COLORING_IMAGES: ColoringImage[] = [
  {
    id: "cat",
    name: "Котик",
    paths: [
      "M150,80 Q120,60 100,80 Q80,100 100,120 Q120,140 150,120 Q180,100 200,80 Q180,60 150,80 Z",
      "M120,90 Q115,85 110,90 Q115,95 120,90 Z",
      "M180,90 Q175,85 170,90 Q175,95 180,90 Z",
      "M150,110 Q140,115 150,120 Q160,115 150,110 Z",
    ],
  },
  {
    id: "butterfly",
    name: "Бабочка",
    paths: [
      "M150,100 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0",
      "M145,95 L140,85",
      "M155,95 L160,85",
      "M150,105 L150,140",
      "M145,110 Q120,100 110,120 Q105,140 120,145 Q135,150 145,130 Z",
      "M155,110 Q180,100 190,120 Q195,140 180,145 Q165,150 155,130 Z",
      "M145,130 Q125,145 115,165 Q112,180 130,182 Q145,180 145,165 Z",
      "M155,130 Q175,145 185,165 Q188,180 170,182 Q155,180 155,165 Z",
      "M125,120 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0",
      "M175,120 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0",
    ],
  },
  {
    id: "house",
    name: "Домик",
    paths: [
      "M90,120 L90,170 L210,170 L210,120 Z",
      "M80,120 L150,70 L220,120 Z",
      "M125,145 L125,170 L175,170 L175,145 Z",
      "M170,145 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0",
      "M105,130 L105,150 L125,150 L125,130 Z",
      "M175,130 L175,150 L195,150 L195,130 Z",
      "M110,130 L110,150",
      "M120,130 L120,150",
      "M105,140 L125,140",
      "M180,130 L180,150",
      "M190,130 L190,150",
      "M175,140 L195,140",
      "M140,80 L140,95 L160,95 L160,80 Z",
    ],
  },
  {
    id: "car",
    name: "Машинка",
    paths: [
      "M70,135 L70,160 L230,160 L230,135 Q220,135 215,125 L180,125 L170,105 L130,105 L120,125 L85,125 Q80,135 70,135 Z",
      "M125,110 L125,120 L175,120 L175,110 Z",
      "M100,160 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0",
      "M200,160 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0",
      "M100,160 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0",
      "M200,160 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0",
      "M225,140 L235,140 L235,150 L225,150 Z",
      "M230,143 m-1.5,0 a1.5,1.5 0 1,0 3,0 a1.5,1.5 0 1,0 -3,0",
    ],
  },
  {
    id: "fish",
    name: "Рыбка",
    paths: [
      "M100,100 Q130,80 170,100 Q130,120 100,100 Z",
      "M100,100 L70,85 L80,100 L70,115 Z",
      "M155,95 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0",
      "M140,85 L150,78 L145,88 Z",
      "M135,95 Q142,98 135,102",
      "M125,100 Q132,103 125,107",
      "M115,105 Q122,108 115,112",
      "M145,115 L153,128 L147,122 Z",
    ],
  },
  {
    id: "star",
    name: "Звездочка",
    paths: [
      "M150,70 L160,100 L192,105 L167,125 L175,157 L150,142 L125,157 L133,125 L108,105 L140,100 Z",
      "M150,110 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0",
      "M150,102 L154,110 L150,118 L146,110 Z",
    ],
  },
  {
    id: "bear",
    name: "Мишка",
    paths: [
      "M110,80 m-15,0 a15,15 0 1,0 30,0 a15,15 0 1,0 -30,0",
      "M190,80 m-15,0 a15,15 0 1,0 30,0 a15,15 0 1,0 -30,0",
      "M150,110 m-35,0 a35,35 0 1,0 70,0 a35,35 0 1,0 -70,0",
      "M135,105 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0",
      "M165,105 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0",
      "M150,120 Q145,125 150,130 Q155,125 150,120",
      "M135,135 Q150,142 165,135",
      "M150,160 Q125,165 115,185 Q125,190 150,185 Q175,190 185,185 Q175,165 150,160 Z",
      "M115,180 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0",
      "M185,180 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0",
    ],
  },
  {
    id: "rocket",
    name: "Ракета",
    paths: [
      "M150,60 L165,110 L165,150 L150,170 L135,150 L135,110 Z",
      "M150,100 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0",
      "M140,118 L160,118 L160,125 L140,125 Z",
      "M140,130 L160,130 L160,137 L140,137 Z",
      "M135,150 L122,163 L135,168 Z",
      "M165,150 L178,163 L165,168 Z",
      "M138,168 Q150,180 162,168",
      "M143,173 L142,182",
      "M150,175 L150,185",
      "M157,173 L158,182",
    ],
  },
  {
    id: "flower",
    name: "Цветочек",
    paths: [
      "M150,100 Q130,80 120,100 Q130,120 150,100 Z",
      "M150,100 Q170,80 180,100 Q170,120 150,100 Z",
      "M150,100 Q130,120 120,140 Q140,140 150,100 Z",
      "M150,100 Q170,120 180,140 Q160,140 150,100 Z",
      "M145,95 Q150,90 155,95 Q150,100 145,95 Z",
      "M147,105 L147,165",
      "M135,140 Q125,135 120,145 Q130,145 135,140 Z",
      "M160,155 Q170,150 175,160 Q165,160 160,155 Z",
    ],
  },
  {
    id: "sun",
    name: "Солнышко",
    paths: [
      "M150,100 m-30,0 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0",
      "M150,50 L150,70",
      "M150,130 L150,150",
      "M110,60 L120,75",
      "M190,60 L180,75",
      "M100,100 L120,100",
      "M200,100 L180,100",
      "M110,140 L120,125",
      "M190,140 L180,125",
      "M140,95 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0",
      "M160,95 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0",
      "M140,110 Q150,115 160,110",
    ],
  },
  {
    id: "balloon",
    name: "Шарик",
    paths: [
      "M150,40 C115,40 110,95 150,150 C190,95 185,40 150,40 Z",
      "M143,150 L157,150 L150,162 Z",
      "M150,162 Q162,180 150,196",
    ],
  },
  {
    id: "heart",
    name: "Сердечко",
    paths: [
      "M150,170 C150,170 95,130 95,95 C95,72 113,60 132,60 C142,60 150,68 150,78 C150,68 158,60 168,60 C187,60 205,72 205,95 C205,130 150,170 150,170 Z",
    ],
  },
  {
    id: "icecream",
    name: "Мороженое",
    paths: [
      "M130,150 L170,150 L150,195 Z",
      "M150,135 m-22,0 a22,22 0 1,0 44,0 a22,22 0 1,0 -44,0",
      "M150,110 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0",
      "M150,88 m-17,0 a17,17 0 1,0 34,0 a17,17 0 1,0 -34,0",
    ],
  },
  {
    id: "tree",
    name: "Ёлочка",
    paths: [
      "M150,50 L120,100 L180,100 Z",
      "M150,85 L110,140 L190,140 Z",
      "M150,120 L100,175 L200,175 Z",
      "M140,175 L160,175 L160,195 L140,195 Z",
    ],
  },
  {
    id: "mushroom",
    name: "Грибок",
    paths: [
      "M100,110 Q150,55 200,110 Z",
      "M135,110 L135,170 Q150,180 165,170 L165,110 Z",
      "M125,90 m-7,0 a7,7 0 1,0 14,0 a7,7 0 1,0 -14,0",
      "M170,95 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0",
    ],
  },
  {
    id: "apple",
    name: "Яблочко",
    paths: [
      "M150,80 C120,60 95,90 105,130 C112,160 135,175 150,160 C165,175 188,160 195,130 C205,90 180,60 150,80 Z",
      "M150,75 L150,55",
      "M150,60 Q170,45 185,60 Q170,72 150,60 Z",
    ],
  },
  {
    id: "ball",
    name: "Мячик",
    paths: [
      "M150,100 m-50,0 a50,50 0 1,0 100,0 a50,50 0 1,0 -100,0 Z",
      "M100,100 Q150,80 200,100 Q150,120 100,100 Z",
      "M150,50 Q130,100 150,150 Q170,100 150,50 Z",
    ],
  },
  {
    id: "cloud",
    name: "Тучка",
    paths: [
      "M110,120 Q90,120 90,105 Q90,90 108,90 Q112,72 135,75 Q145,60 165,68 Q190,62 192,88 Q210,90 208,108 Q208,122 190,122 Z",
      "M120,135 L114,152",
      "M150,135 L144,152",
      "M180,135 L174,152",
    ],
  },
];

const LEVELS: { title: string; images: (ColoringImage | NumberedColoring)[] }[] = [
  { title: "Лёгкие", images: COLORING_IMAGES },
  { title: "С деталями", images: COLORING_SCENES },
  { title: "По номерам", images: NUMBERED_COLORINGS },
];

async function renderColoring(image: ColoringImage, colors: Record<number, string>, strokeWidth: number) {
  const paths = image.paths.map((path, index) =>
    `<path d="${path}" fill="${colors[index] ?? "#ffffff"}" stroke="#202234" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 300 200"><rect width="300" height="200" fill="white"/>${paths}</svg>`;
  const picture = new Image();
  picture.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await picture.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 400;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(picture, 0, 0);
  return canvas.toDataURL("image/png");
}

export const ColoringBook = () => {
  const { t, label } = useLanguage();
  const owner = useGalleryOwner();
  const saving = useRef(false);
  const drafts = useRef<Record<string, Drawing>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [showPicker, setShowPicker] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(1);
  const [hint, setHint] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState("#FF0000");
  const [levelIndex, setLevelIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [painted, setPainted] = useState<Record<string, Record<number, string>>>({});

  const { images } = LEVELS[levelIndex];
  const currentImage = images[currentImageIndex];
  const coloredPaths = painted[currentImage.id];

  const numbered = "labels" in currentImage ? currentImage : null;
  const strokeWidth = levelIndex === 0 ? 2 : 1.35;
  const saveKey = owner ? `${owner.id}:${currentImage.id}` : currentImage.id;
  const hasPaint = !!coloredPaths && Object.keys(coloredPaths).length > 0;

  const changePaint = (colors: Record<number, string>) => {
    delete drafts.current[saveKey];
    setSaved((prev) => ({ ...prev, [saveKey]: false }));
    setSaveStatus("idle");
    setPainted((prev) => ({ ...prev, [currentImage.id]: colors }));
  };

  const handlePathClick = (index: number) => {
    if (saving.current) return;
    const required = numbered?.labels[index].number;
    if (required && required !== selectedNumber) {
      if (!coloredPaths?.[index]) setHint(required);
      return;
    }
    const color = numbered ? numbered.palette[selectedNumber - 1] : selectedColor;
    setHint(null);
    if (coloredPaths?.[index] !== color) changePaint({ ...coloredPaths, [index]: color });
  };

  const selectImage = (index: number) => {
    setCurrentImageIndex(index);
    setSelectedNumber(1);
    setHint(null);
    setSaveStatus("idle");
    setShowPicker(false);
  };

  const save = async () => {
    if (!owner || !coloredPaths || !hasPaint || saving.current || saved[saveKey]) return;
    saving.current = true;
    setSaveStatus("saving");
    try {
      const drawing = drafts.current[saveKey] ?? {
        id: crypto.randomUUID(),
        title: t(`Раскраска · ${label(currentImage.name)}`, `Coloring page · ${label(currentImage.name)}`),
        image_data: await renderColoring(currentImage, coloredPaths, strokeWidth),
        created_at: new Date().toISOString(),
      };
      drafts.current[saveKey] = drawing;
      await saveDrawing(owner, drawing, "coloring");
      setSaved((prev) => ({ ...prev, [saveKey]: true }));
      setSaveStatus("idle");
    } catch {
      setSaveStatus("error");
    } finally {
      saving.current = false;
    }
  };

  const move = (direction: number) => selectImage((currentImageIndex + direction + images.length) % images.length);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2">
        {LEVELS.map((level, index) => (
          <Button key={label(level.title)} variant={index === levelIndex ? "default" : "outline"}
            aria-pressed={index === levelIndex} disabled={saveStatus === "saving"}
            onClick={() => {
              if (index === levelIndex) return;
              setLevelIndex(index);
              selectImage(0);
            }}>
            {label(level.title)} · {level.images.length}
          </Button>
        ))}
      </div>

      <div className="flex w-full max-w-xl items-center justify-between gap-2">
        <Button variant="outline" size="icon" aria-label={t("Предыдущая раскраска", "Previous coloring page")} disabled={saveStatus === "saving"} onClick={() => move(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 text-center" aria-live="polite">
          <h3 className="text-lg font-bold sm:text-2xl">{label(currentImage.name)}</h3>
          <p className="text-sm text-muted-foreground">{currentImageIndex + 1} {t("из", "of")} {images.length}</p>
        </div>
        <Button variant="outline" size="icon" aria-label={t("Следующая раскраска", "Next coloring page")} disabled={saveStatus === "saving"} onClick={() => move(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Button variant="outline" disabled={saveStatus === "saving"} onClick={() => setShowPicker(true)}>
        <Images className="mr-2 h-4 w-4" /> {t("Выбрать картинку", "Choose a picture")}
      </Button>
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("Выбрать раскраску", "Choose a coloring page")}</DialogTitle>
            <DialogDescription>{label(LEVELS[levelIndex].title)}</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[65vh] grid-cols-2 gap-2 overflow-y-auto p-1 sm:grid-cols-3">
            {images.map((image, index) => (
              <button key={image.id} type="button" aria-current={currentImageIndex === index}
                onClick={() => selectImage(index)}
                className="overflow-hidden rounded-xl border bg-card p-2 text-sm hover:border-primary focus-visible:outline focus-visible:outline-primary">
                <svg aria-hidden="true" viewBox="0 0 300 200" className="mb-1 block w-full bg-white">
                  {image.paths.map((path, i) => <path key={i} d={path} fill="white" stroke="#202234" strokeWidth="3" />)}
                </svg>
                {label(image.name)}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-center text-sm text-muted-foreground">
        {numbered ? t("Выбери краску с таким же номером, как на рисунке.", "Pick the paint with the same number as the section in the picture.") : t("Выбери цвет и нажми на деталь рисунка.", "Choose a color and tap part of the picture.")}
      </p>
      {numbered ? (
        <div className="flex flex-wrap justify-center gap-2">
          {numbered.palette.map((color, index) => (
            <Button key={color} variant="outline" size="icon" aria-label={t(`Цвет ${index + 1}`, `Color ${index + 1}`)}
              aria-pressed={selectedNumber === index + 1}
              style={{ backgroundColor: color }}
              className={`font-bold text-slate-950 ${hint === index + 1 ? "ring-4 ring-amber-500" : selectedNumber === index + 1 ? "ring-2 ring-slate-900" : ""}`}
              onClick={() => { setSelectedNumber(index + 1); setHint(null); }}>
              {index + 1}
            </Button>
          ))}
        </div>
      ) : <ColorPalette selectedColor={selectedColor} onColorSelect={setSelectedColor} />}
      {hint !== null && <p role="status">{t("Для этой детали нужен цвет №", "This section uses color number")} {hint}.</p>}

      <div className="w-full max-w-xl overflow-hidden rounded-2xl border-4 border-primary/20 bg-white shadow-sm">
        <svg viewBox="0 0 300 200" aria-label={label(currentImage.name)} className="block h-auto w-full">
          {currentImage.paths.map((path, index) => (
            <path
              key={index}
              d={path}
              fill={coloredPaths?.[index] || "#ffffff"}
              stroke="#202234"
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              onClick={() => handlePathClick(index)}
              className="cursor-pointer"
            />
          ))}
          {numbered?.labels.map(({ x, y, number }, index) => !coloredPaths?.[index] && (
            <text key={index} x={x} y={y} textAnchor="middle" dominantBaseline="central"
              fontSize="8" fontWeight="700" fill="#202234" pointerEvents="none" aria-hidden="true">{number}</text>
          ))}
        </svg>
      </div>

      {numbered && Object.keys(coloredPaths ?? {}).length === numbered.paths.length && (
        <p role="status" className="font-semibold">{t("Готово! Все детали раскрашены.", "Done! You colored the whole picture.")}</p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" disabled={!hasPaint || saveStatus === "saving"} onClick={() => { changePaint({}); setHint(null); }}>
          <RotateCcw className="mr-2 h-4 w-4" /> {t("Очистить", "Clear")}
        </Button>
        <Button disabled={!owner || !hasPaint || saveStatus === "saving" || !!saved[saveKey]} onClick={() => void save()}>
          <Save className="mr-2 h-4 w-4" /> {saveStatus === "saving" ? t("Сохраняем…", "Saving…") : t("Сохранить в галерею", "Save to gallery")}
        </Button>
      </div>
      {saved[saveKey] && <p role="status">{t("Раскраска в галерее.", "Coloring page saved to the gallery.")}</p>}
      {saveStatus === "error" && <p role="status">{t("Не удалось сохранить раскраску. Попробуй ещё раз.", "Couldn’t save the coloring page. Try again.")}</p>}
    </div>
  );
};
