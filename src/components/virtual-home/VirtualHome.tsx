import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Heart, ShoppingBag, Sprout } from "lucide-react";
import { RoomView } from "./RoomView";
import { PetCare } from "./PetCare";
import { ItemShop } from "./ItemShop";
import { Garden } from "./Garden";
import { GiftInbox } from "./GiftInbox";

export const VirtualHome = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("room");
  const [roomKey, setRoomKey] = useState(0);

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <GiftInbox onOpened={() => { setActiveTab("room"); setRoomKey((k) => k + 1); }} />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="room" className="flex items-center gap-1 rounded-lg text-xs sm:text-sm">
            <Home className="w-4 h-4" />
            <span>{t("Комната", "Room")}</span>
          </TabsTrigger>
          <TabsTrigger value="care" className="flex items-center gap-1 rounded-lg text-xs sm:text-sm">
            <Heart className="w-4 h-4 text-rose-500" />
            <span>{t("Уход", "Care")}</span>
          </TabsTrigger>
          <TabsTrigger value="garden" className="flex items-center gap-1 rounded-lg text-xs sm:text-sm">
            <Sprout className="w-4 h-4 text-emerald-600" />
            <span>{t("Садик", "Garden")}</span>
          </TabsTrigger>
          <TabsTrigger value="shop" className="flex items-center gap-1 rounded-lg text-xs sm:text-sm">
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            <span>{t("Магазин", "Shop")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="room" className="space-y-4">
          <RoomView key={roomKey} />
        </TabsContent>

        <TabsContent value="care" className="space-y-4">
          <PetCare />
        </TabsContent>

        <TabsContent value="garden" className="space-y-4">
          <Garden />
        </TabsContent>

        <TabsContent value="shop" className="space-y-4">
          <ItemShop />
        </TabsContent>
      </Tabs>
    </div>
  );
};
