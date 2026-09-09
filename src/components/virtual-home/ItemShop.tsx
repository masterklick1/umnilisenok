import { useState } from "react";
import { useVirtualHome, Pet, RoomItem } from "@/hooks/useVirtualHome";
import { useUserProgress } from "@/hooks/useUserProgress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, ShoppingBag, Heart, Check } from "lucide-react";

export const ItemShop = () => {
  const { roomItems, pets, userRoomItems, userPets, buyItem, adoptPet } = useVirtualHome();
  const { progress } = useUserProgress();

  // Состояния для модального окна приюта/покупки питомца
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [petName, setPetName] = useState("");
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Проверка: куплена ли уже меблировка
  const isItemPurchased = (itemId: string) => {
    return userRoomItems.some((item) => item.item_id === itemId);
  };

  // Покупка предмета интерьера
  const handleBuyItem = async (item: RoomItem) => {
    setIsSubmitting(true);
    await buyItem(item);
    setIsSubmitting(false);
  };

  // Открытие диалога для покупки питомца
  const handleOpenPetModal = (pet: Pet) => {
    setSelectedPet(pet);
    setPetName("");
    setIsPetModalOpen(true);
  };

  // Подтверждение покупки питомца
  const handleConfirmAdopt = async () => {
    if (!selectedPet || !petName.trim()) return;

    setIsSubmitting(true);
    const success = await adoptPet(selectedPet, petName.trim());
    setIsSubmitting(false);

    if (success) {
      setIsPetModalOpen(false);
      setSelectedPet(null);
      setPetName("");
    }
  };

  const userStars = progress?.stars || 0;

  return (
    <div className="space-y-6">
      {/* Шапка магазина с балансом звёзд */}
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-100 to-yellow-100 p-4 rounded-xl border border-yellow-200">
        <div>
          <h2 className="text-xl font-bold text-amber-900">Магазин товаров</h2>
          <p className="text-sm text-amber-700">Украшай комнату и заводи новых питомцев</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-yellow-300">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <span className="font-bold text-amber-900">{userStars}</span>
        </div>
      </div>

      {/* Вкладки: Предметы / Питомцы */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="items" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Мебель и декор
          </TabsTrigger>
          <TabsTrigger value="pets" className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            Питомцы
          </TabsTrigger>
        </TabsList>

        {/* Вкладка 1: Предметы интерьера */}
        <TabsContent value="items" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {roomItems.map((item: RoomItem) => {
              const purchased = isItemPurchased(item.id);
              const canAfford = userStars >= item.price_stars;

              return (
                <Card key={item.id} className="flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="text-4xl text-center my-2">{item.icon}</div>
                    <CardTitle className="text-base text-center">{item.name}</CardTitle>
                    {item.description && (
                      <CardDescription className="text-xs text-center">
                        {item.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-1 text-sm font-semibold text-amber-600">
                      <Star className="w-4 h-4 fill-amber-500" />
                      {item.price_stars}
                    </div>

                    {purchased ? (
                      <Button variant="secondary" disabled className="w-full gap-1">
                        <Check className="w-4 h-4 text-green-600" />Куплено
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleBuyItem(item)}
                        disabled={!canAfford || isSubmitting}
                        className="w-full"
                      >
                        Купить
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Вкладка 2: Питомцы */}
        <TabsContent value="pets" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pets.map((pet: Pet) => {
              const canAfford = userStars >= pet.price_stars;
              // Считаем сколько питомцев такого типа уже заведено
              const countOwned = userPets.filter((p) => p.pet_id === pet.id).length;

              return (
                <Card key={pet.id} className="flex flex-col justify-between border-rose-100">
                  <CardHeader className="pb-2">
                    <div className="text-5xl text-center my-2">{pet.icon}</div>
                    <CardTitle className="text-base text-center">{pet.species || pet.name}</CardTitle>
                    {countOwned > 0 && (
                      <CardDescription className="text-xs text-center text-rose-500 font-medium">
                        У вас уже есть ({countOwned})
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-1 text-sm font-semibold text-amber-600">
                      <Star className="w-4 h-4 fill-amber-500" />
                      {pet.price_stars}
                    </div>

                    <Button
                      onClick={() => handleOpenPetModal(pet)}
                      disabled={!canAfford || isSubmitting}
                      className="w-full bg-rose-500 hover:bg-rose-600 text-white"
                    >
                      Завести питомца
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Диалог выбора имени питомца */}
      <Dialog open={isPetModalOpen} onOpenChange={setIsPetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedPet?.icon}</span> Новый питомец!
            </DialogTitle>
            <DialogDescription>
              Придумай имя для своего нового друга ({selectedPet?.species || selectedPet?.name}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pet-name">Кличка питомца</Label>
              <Input
                id="pet-name"
                placeholder="Например: Барсик, Дружок..."
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                maxLength={20}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPetModalOpen(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button
              onClick={handleConfirmAdopt}
              disabled={!petName.trim() || isSubmitting}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              Подтвердить ({selectedPet?.price_stars} ⭐)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
