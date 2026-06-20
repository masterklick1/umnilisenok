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
