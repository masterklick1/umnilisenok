import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import { Eraser, Pencil, Trash2 } from "lucide-react";
import { ColorPalette } from "./ColorPalette";
import { toast } from "sonner";

export const FreeDrawing = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#000000");
  const [activeTool, setActiveTool] = useState<"draw" | "eraser">("draw");

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: Math.min(window.innerWidth - 32, 600),
      height: Math.min(window.innerHeight - 300, 500),
      backgroundColor: "#ffffff",
    });

    canvas.isDrawingMode = true;
    
    // Initialize brush properties
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = 5;
      canvas.freeDrawingBrush.color = activeColor;
    }

    fabricCanvasRef.current = canvas;

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas?.freeDrawingBrush) return;
    
    if (activeTool === "draw") {
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = 5;
    } else if (activeTool === "eraser") {
      canvas.freeDrawingBrush.color = "#ffffff";
      canvas.freeDrawingBrush.width = 20;
    }
  }, [activeTool, activeColor]);

  const handleColorChange = (color: string) => {
    setActiveColor(color);
    if (activeTool !== "draw") {
      setActiveTool("draw");
    }
  };

  const handleClear = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
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
