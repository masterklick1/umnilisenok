import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Heart, ShoppingBag } from "lucide-react";
import { RoomView } from "./RoomView";
import { PetCare } from "./PetCare";
import { ItemShop } from "./ItemShop";

export const VirtualHome = () => {
  const [activeTab, setActiveTab] = useState("room");

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="room" className="flex items-center gap-2 rounded-lg">
            <Home className="w-4 h-4" />
            <span>Моя комната</span>
          </TabsTrigger>
          <TabsTrigger value="care" className="flex items-center gap-2 rounded-lg">
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Уход</span>
          </TabsTrigger>
          <TabsTrigger value="shop" className="flex items-center gap-2 rounded-lg">
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            <span>Магазин</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="room" className="space-y-4">
          <RoomView />
        </TabsContent>

        <TabsContent value="care" className="space-y-4">
          <PetCare />
        </TabsContent>

        <TabsContent value="shop" className="space-y-4">
          <ItemShop />
        </TabsContent>
      </Tabs>
    </div>
  );
};
