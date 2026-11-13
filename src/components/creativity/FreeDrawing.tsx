import { useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, FlipHorizontal2, Pencil, Trash2, Undo2 } from "lucide-react";
import { ColorPalette } from "./ColorPalette";

const WIDTH = 600;
const HEIGHT = 480;
const HISTORY_LIMIT = 12;

type Point = { x: number; y: number };
type Stroke = {
  pointerId: number;
  point: Point;
  color: string;
  width: number;
  mirror: boolean;
};

function canvasPoint(event: PointerEvent<HTMLCanvasElement>): Point {
  const canvas = event.currentTarget;
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height,
  };
}

function paintSegment(ctx: CanvasRenderingContext2D, from: Point, to: Point, stroke: Stroke) {
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (from.x === to.x && from.y === to.y) {
    ctx.arc(to.x, to.y, stroke.width / 2, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
}

function paint(ctx: CanvasRenderingContext2D, to: Point, stroke: Stroke) {
  paintSegment(ctx, stroke.point, to, stroke);
  if (stroke.mirror) {
    paintSegment(ctx, { x: WIDTH - stroke.point.x, y: stroke.point.y }, { x: WIDTH - to.x, y: to.y }, stroke);
  }
}

export const FreeDrawing = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokeRef = useRef<Stroke | null>(null);
  const history = useRef<ImageData[]>([]);
  const [activeColor, setActiveColor] = useState("#000000");
  const [activeTool, setActiveTool] = useState<"draw" | "eraser">("draw");
  const [mirror, setMirror] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  const remember = (ctx: CanvasRenderingContext2D) => {
    if (history.current.length === HISTORY_LIMIT) history.current.shift();
    history.current.push(ctx.getImageData(0, 0, WIDTH, HEIGHT));
    setCanUndo(true);
  };

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || strokeRef.current) return;
    const canvas = event.currentTarget;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = canvasPoint(event);
    const stroke = {
      pointerId: event.pointerId,
      point,
      color: activeTool === "draw" ? activeColor : "#ffffff",
      width: activeTool === "draw" ? 5 : 20,
      mirror,
    };
    remember(ctx);
    strokeRef.current = stroke;
    canvas.setPointerCapture(event.pointerId);
    paint(ctx, point, stroke);
    setHasDrawing(true);
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    const stroke = strokeRef.current;
    if (stroke?.pointerId !== event.pointerId) return;
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    const point = canvasPoint(event);
    paint(ctx, point, stroke);
    stroke.point = point;
  };

  const stopDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (strokeRef.current?.pointerId === event.pointerId) strokeRef.current = null;
  };

  const undo = () => {
    if (strokeRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const previous = history.current.pop();
    if (!previous) return;
    ctx.putImageData(previous, 0, 0);
    setCanUndo(history.current.length > 0);
    setHasDrawing(previous.data.some((value, index) => index % 4 === 3 && value > 0));
  };

  const clear = () => {
    if (strokeRef.current || !hasDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    remember(ctx);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    setHasDrawing(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full flex-wrap justify-center gap-2">
        <Button variant={activeTool === "draw" ? "default" : "outline"} aria-pressed={activeTool === "draw"} onClick={() => setActiveTool("draw")}>
          <Pencil className="mr-2 h-4 w-4" /> Кисть
        </Button>
        <Button variant={activeTool === "eraser" ? "default" : "outline"} aria-pressed={activeTool === "eraser"} onClick={() => setActiveTool("eraser")}>
          <Eraser className="mr-2 h-4 w-4" /> Ластик
        </Button>
        <Button variant="outline" onClick={undo} disabled={!canUndo}>
          <Undo2 className="mr-2 h-4 w-4" /> Отменить
        </Button>
        <Button variant="outline" onClick={clear} disabled={!hasDrawing}>
          <Trash2 className="mr-2 h-4 w-4" /> Очистить
        </Button>
      </div>

      <ColorPalette selectedColor={activeColor} onColorSelect={(color) => {
        setActiveColor(color);
        setActiveTool("draw");
      }} />

      <Button variant={mirror ? "default" : "outline"} aria-pressed={mirror} onClick={() => setMirror((value) => !value)}>
        <FlipHorizontal2 className="mr-2 h-4 w-4" /> Зеркальная кисть
      </Button>
      {mirror && <p className="text-center text-sm text-muted-foreground">Нарисуй одно крыло бабочки. Второе появится само!</p>}

      <div className="relative w-full max-w-[600px] overflow-hidden rounded-2xl border-4 border-primary/20 bg-white shadow-xl">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          aria-label="Холст для рисования"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onLostPointerCapture={stopDrawing}
          className="block h-auto w-full touch-none cursor-crosshair"
        />
        {mirror && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 border-l-2 border-dashed border-violet-400/70" />}
      </div>
    </div>
  );
};
