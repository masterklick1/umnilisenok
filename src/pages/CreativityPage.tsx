import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Images, Palette, Pencil, Sticker } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FreeDrawing } from "@/components/creativity/FreeDrawing";
import { ColoringBook } from "@/components/creativity/ColoringBook";
import { Gallery } from "@/components/virtual-home/Gallery";
import { StickerBoard } from "@/components/creativity/StickerBoard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActivityTracker } from "@/hooks/useActivityTracker";

const CreativityPage = () => {
  const navigate = useNavigate();
  useActivityTracker();
  const [activeTab, setActiveTab] = useState("draw");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-background pb-8">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
            <span>🎨</span>
            <span className="text-gradient">Творчество</span>
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mx-auto mb-6 grid h-auto w-full max-w-xl grid-cols-2 gap-1 sm:grid-cols-4">
            <TabsTrigger value="draw" className="min-w-0 flex-col gap-1 px-1 text-xs sm:flex-row sm:gap-2 sm:text-sm">
              <Pencil className="w-4 h-4" />
              Рисовать
            </TabsTrigger>
            <TabsTrigger value="coloring" className="min-w-0 flex-col gap-1 px-1 text-xs sm:flex-row sm:gap-2 sm:text-sm">
              <Palette className="w-4 h-4" />
              Раскрашивать
            </TabsTrigger>
            <TabsTrigger value="stickers" className="min-w-0 flex-col gap-1 px-1 text-xs sm:flex-row sm:gap-2 sm:text-sm">
              <Sticker className="w-4 h-4" />
              Наклейки
            </TabsTrigger>
            <TabsTrigger value="gallery" className="min-w-0 flex-col gap-1 px-1 text-xs sm:flex-row sm:gap-2 sm:text-sm">
              <Images className="w-4 h-4" />
              Галерея
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" forceMount className="data-[state=inactive]:hidden">
            <FreeDrawing />
          </TabsContent>

          <TabsContent value="coloring" forceMount className="data-[state=inactive]:hidden">
            <ColoringBook />
          </TabsContent>

          <TabsContent value="stickers">
            <StickerBoard />
          </TabsContent>
          <TabsContent value="gallery">
            <Gallery />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreativityPage;
