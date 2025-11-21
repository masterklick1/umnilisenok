import { cn } from "@/lib/utils";

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const COLORS = [
  "#000000", // Black
  "#FF0000", // Red
  "#00FF00", // Green
  "#0000FF", // Blue
  "#FFFF00", // Yellow
  "#FF6B35", // Orange
  "#9B59B6", // Purple
  "#FF69B4", // Pink
  "#8B4513", // Brown
  "#FFFFFF", // White
];

export const ColorPalette = ({ selectedColor, onColorSelect }: ColorPaletteProps) => {
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onColorSelect(color)}
          className={cn(
            "w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110",
            selectedColor === color ? "border-foreground scale-110 shadow-lg" : "border-border"
          )}
          style={{ backgroundColor: color }}
          aria-label={`Выбрать цвет ${color}`}
        />
      ))}
    </div>
  );
};
