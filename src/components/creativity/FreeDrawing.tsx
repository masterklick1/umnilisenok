import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Pencil, Trash2 } from "lucide-react";
import { ColorPalette } from "./ColorPalette";
import { toast } from "sonner";

export const FreeDrawing = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeColor, setActiveColor] = useState("#000000");
  const [activeTool, setActiveTool] = useState<"draw" | "eraser">("draw");
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = Math.min(window.innerWidth - 32, 600);
    canvas.height = Math.min(window.innerHeight - 300, 500);
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      setContext(ctx);
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!context || !canvasRef.current) return;
    
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    context.strokeStyle = activeTool === "draw" ? activeColor : "#ffffff";
    context.lineWidth = activeTool === "draw" ? 5 : 20;
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!context) return;
    setIsDrawing(false);
    context.closePath();
  };

  const handleColorChange = (color: string) => {
    setActiveColor(color);
    if (activeTool !== "draw") {
      setActiveTool("draw");
    }
  };

  const handleClear = () => {
    if (!context || !canvasRef.current) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
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
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="touch-none cursor-crosshair"
        />
      </div>
    </div>
  );
};
