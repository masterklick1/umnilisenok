import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Palette, Pencil, Sticker } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FreeDrawing } from "@/components/creativity/FreeDrawing";
import { ColoringBook } from "@/components/creativity/ColoringBook";
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
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад
          </Button>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <span>🎨</span>
            <span className="text-gradient">Творчество</span>
          </h1>
          <div className="w-24" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-xl mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="draw" className="gap-2">
              <Pencil className="w-4 h-4" />
              Рисовать
            </TabsTrigger>
            <TabsTrigger value="coloring" className="gap-2">
              <Palette className="w-4 h-4" />
              Раскрашивать
            </TabsTrigger>
            <TabsTrigger value="stickers" className="gap-2">
              <Sticker className="w-4 h-4" />
              Наклейки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw">
            <FreeDrawing />
          </TabsContent>

          <TabsContent value="coloring">
            <ColoringBook />
          </TabsContent>

          <TabsContent value="stickers">
            <StickerBoard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreativityPage;
