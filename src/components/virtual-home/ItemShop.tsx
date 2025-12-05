import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVirtualHome } from "@/hooks/useVirtualHome";
import { useUserProgress } from "@/hooks/useUserProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Star } from "lucide-react";

export const ItemShop = () => {
  const { roomItems, userRoomItems, loading, buyItem } = useVirtualHome();
  const { progress } = useUserProgress();
  const [category, setCategory] = useState("furniture");

  const categories = [
    { id: "furniture", label: "Мебель", icon: "🪑" },
    { id: "decoration", label: "Декор", icon: "⭐" },
    { id: "wallpaper", label: "Обои", icon: "🖼️" },
    { id: "floor", label: "Пол", icon: "🟫" },
  ];

  const filteredItems = roomItems.filter((item) => item.category === category);
  const ownedItemIds = userRoomItems.map((ui) => ui.item_id);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stars Balance */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center justify-center gap-2">
          <Star className="w-6 h-6 text-accent fill-accent" />
          <span className="text-2xl font-bold">{progress?.stars || 0}</span>
          <span className="text-muted-foreground">звёзд</span>
        </div>
      </Card>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="flex gap-1">
              <span>{cat.icon}</span>
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.id} value={cat.id}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const isOwned = ownedItemIds.includes(item.id);
                const canAfford = (progress?.stars || 0) >= item.price_stars;

                return (
                  <Card
                    key={item.id}
                    className={`p-4 flex flex-col items-center gap-2 transition-all ${
                      isOwned ? "bg-muted/50 border-primary" : ""
                    }`}
                  >
                    <div className="text-5xl">{item.icon}</div>
                    <h4 className="font-semibold text-center">{item.name}</h4>
                    {item.description && (
                      <p className="text-xs text-muted-foreground text-center">
                        {item.description}
                      </p>
                    )}
                    
                    {isOwned ? (
                      <div className="flex items-center gap-1 text-primary">
                        <Check className="w-4 h-4" />
                        <span className="text-sm">Куплено</span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!canAfford}
                        onClick={() => buyItem(item)}
                        className="w-full"
                      >
                        <Star className="w-4 h-4 mr-1" />
                        {item.price_stars}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
