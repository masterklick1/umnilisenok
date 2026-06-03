import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, ShoppingBag, Heart, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoomView } from "@/components/virtual-home/RoomView";
import { ItemShop } from "@/components/virtual-home/ItemShop";
import { PetCare } from "@/components/virtual-home/PetCare";
import { Gallery } from "@/components/virtual-home/Gallery";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useActivityTracker } from "@/hooks/useActivityTracker";

const VirtualHomePage = () => {
  const navigate = useNavigate();
  const { progress } = useUserProgress();
  useActivityTracker();
  const [activeTab, setActiveTab] = useState("room");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Мой Домик</h1>
          <ScoreDisplay score={progress?.stars || 0} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="room" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Комната</span>
            </TabsTrigger>
            <TabsTrigger value="shop" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Магазин</span>
            </TabsTrigger>
            <TabsTrigger value="pet" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Питомец</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">Галерея</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="room">
            <RoomView />
          </TabsContent>

          <TabsContent value="shop">
            <ItemShop />
          </TabsContent>

          <TabsContent value="pet">
            <PetCare />
          </TabsContent>

          <TabsContent value="gallery">
            <Gallery />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VirtualHomePage;
