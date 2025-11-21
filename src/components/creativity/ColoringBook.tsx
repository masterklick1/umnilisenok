import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ColorPalette } from "./ColorPalette";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ColoringImage {
  id: string;
  name: string;
  paths: string[];
}

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
    id: "flower",
    name: "Цветочек",
    paths: [
      "M150,100 Q130,80 120,100 Q130,120 150,100 Z",
      "M150,100 Q170,80 180,100 Q170,120 150,100 Z",
      "M150,100 Q130,120 120,140 Q140,140 150,100 Z",
      "M150,100 Q170,120 180,140 Q160,140 150,100 Z",
      "M145,95 Q150,90 155,95 Q150,100 145,95 Z",
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
    ],
  },
];

export const ColoringBook = () => {
  const [selectedColor, setSelectedColor] = useState("#FF0000");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [coloredPaths, setColoredPaths] = useState<Record<number, string>>({});

  const currentImage = COLORING_IMAGES[currentImageIndex];

  const handlePathClick = (index: number) => {
    setColoredPaths((prev) => ({
      ...prev,
      [index]: selectedColor,
    }));
  };

  const handleReset = () => {
    setColoredPaths({});
    toast.success("Раскраска очищена!");
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev + 1) % COLORING_IMAGES.length);
    setColoredPaths({});
  };

  const handlePrev = () => {
    setCurrentImageIndex((prev) => (prev - 1 + COLORING_IMAGES.length) % COLORING_IMAGES.length);
    setColoredPaths({});
  };

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">{currentImage.name}</h3>
        <p className="text-muted-foreground">Кликай на области, чтобы раскрасить!</p>
      </div>

      <ColorPalette selectedColor={selectedColor} onColorSelect={setSelectedColor} />

      <div className="border-4 border-primary/20 rounded-2xl shadow-xl overflow-hidden bg-card p-4">
        <svg
          width="300"
          height="200"
          viewBox="0 0 300 200"
          className="w-full h-auto"
        >
          {currentImage.paths.map((path, index) => (
            <path
              key={index}
              d={path}
              fill={coloredPaths[index] || "#ffffff"}
              stroke="#000000"
              strokeWidth="2"
              onClick={() => handlePathClick(index)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          ))}
        </svg>
      </div>

      <div className="flex gap-3">
        <Button size="lg" variant="outline" onClick={handlePrev}>
          <ChevronLeft className="w-5 h-5 mr-2" />
          Назад
        </Button>
        <Button size="lg" variant="outline" onClick={handleReset}>
          <RotateCcw className="w-5 h-5 mr-2" />
          Очистить
        </Button>
        <Button size="lg" variant="outline" onClick={handleNext}>
          Вперёд
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};
