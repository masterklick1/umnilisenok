import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import { Eraser, Pencil, Trash2 } from "lucide-react";
import { ColorPalette } from "./ColorPalette";
import { toast } from "sonner";

export const FreeDrawing = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#000000");
  const [activeTool, setActiveTool] = useState<"draw" | "eraser">("draw");

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: Math.min(window.innerWidth - 32, 600),
      height: Math.min(window.innerHeight - 300, 500),
      backgroundColor: "#ffffff",
    });

    // Enable drawing mode and configure brush
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = 5;

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [activeColor]);

  useEffect(() => {
    if (!fabricCanvas || !fabricCanvas.freeDrawingBrush) return;

    fabricCanvas.isDrawingMode = true;
    
    if (activeTool === "draw") {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = 5;
    } else if (activeTool === "eraser") {
      fabricCanvas.freeDrawingBrush.color = "#ffffff";
      fabricCanvas.freeDrawingBrush.width = 20;
    }
  }, [activeTool, activeColor, fabricCanvas]);

  const handleColorChange = (color: string) => {
    setActiveColor(color);
    if (activeTool === "draw") {
      setActiveTool("draw");
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    toast.success("Холст очищен!");
  };

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="flex gap-3">
        <Button
          size="lg"
          variant={activeTool === "draw" ? "default" : "outline"}
          onClick={() => setActiveTool("draw")}
        >
          <Pencil className="w-5 h-5 mr-2" />
          Кисть
        </Button>
        <Button
          size="lg"
          variant={activeTool === "eraser" ? "default" : "outline"}
          onClick={() => setActiveTool("eraser")}
        >
          <Eraser className="w-5 h-5 mr-2" />
          Ластик
        </Button>
        <Button
          size="lg"
          variant="destructive"
          onClick={handleClear}
        >
          <Trash2 className="w-5 h-5 mr-2" />
          Очистить
        </Button>
      </div>

      <ColorPalette selectedColor={activeColor} onColorSelect={handleColorChange} />

      <div className="border-4 border-primary/20 rounded-2xl shadow-xl overflow-hidden bg-card">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
