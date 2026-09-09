import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useVirtualHome } from "@/hooks/useVirtualHome";
import { useUserProgress } from "@/hooks/useUserProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Utensils, Gamepad2, Moon, Star, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const PetCare = () => {
  const { pets, userPet, userPets = [], selectPet, loading, adoptPet, feedPet, playWithPet, restPet } = useVirtualHome() as any;
  const { progress } = useUserProgress();
  const [petName, setPetName] = useState("");
  const [selectedPetToAdopt, setSelectedPetToAdopt] = useState<typeof pets[0] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showAdoptNew, setShowAdoptNew] = useState(false);

  // Список всех имеющихся у пользователя питомцев (если их несколько)
  const myPetsList = userPets && userPets.length > 0 ? userPets : (userPet ? [userPet] : []);

  const handleAdopt = async () => {
    if (selectedPetToAdopt && petName.trim()) {
      const success = await adoptPet(selectedPetToAdopt, petName.trim());
      if (success) {
        setIsDialogOpen(false);
        setShowAdoptNew(false);
        setPetName("");
        setSelectedPetToAdopt(null);
      }
    }
  };

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  // Если у пользователя есть хоть один питомец и не нажата кнопка "Завести ещё"
  if (myPetsList.length > 0 && !showAdoptNew) {
    return (
      <div className="space-y-6">
        {/* Список питомцев (если их несколько) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {myPetsList.map((item: any, idx: number) => {
            const isSelected = userPet?.id === item.id || (!userPet && idx === 0);
            return (
              <Button
                key={item.id || idx}
                variant={isSelected ? "default" : "outline"}
                className="rounded-full flex items-center gap-2"
                onClick={() => selectPet && selectPet(item)}
              >
                <span>{item.pets?.icon || "🐾"}</span>
                <span>{item.pet_name}</span>
              </Button>
            );
          })}
          
          <Button
            variant="dashed"
            className="rounded-full border-2 border-dashed border-primary/50 text-primary flex items-center gap-1"
            onClick={() => setShowAdoptNew(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Ещё питомец</span>
          </Button>
        </div>

        {/* Активный питомец */}
        {userPet && (
          <>
            <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="text-8xl mb-4 animate-bounce-gentle">{userPet.pets?.icon || "🐾"}</div>
              <h2 className="text-2xl font-bold mb-2">{userPet.pet_name}</h2>
              <p className="text-muted-foreground">{userPet.pets?.name}</p>
            </Card>

            {/* Характеристики */}
            <div className="grid gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span className="font-semibold">Счастье</span>
                  <span className="ml-auto">{userPet.happiness}%</span>
                </div>
                <Progress value={userPet.happiness} className="h-3" />
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Utensils className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold">Сытость</span>
                  <span className="ml-auto">{userPet.hunger}%</span>
                </div>
                <Progress value={userPet.hunger} className="h-3" />
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Moon className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold">Энергия</span>
                  <span className="ml-auto">{userPet.energy}%</span>
                </div>
                <Progress value={userPet.energy} className="h-3" />
              </Card>
            </div>

            {/* Действия */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={feedPet}
                variant="outline"
                className="h-20 flex flex-col gap-2"
                disabled={userPet.hunger >= 100}
              >
                <Utensils className="w-6 h-6" />
                <span>Покормить</span>
              </Button>
              <Button
                onClick={playWithPet}
                variant="outline"
                className="h-20 flex flex-col gap-2"
                disabled={userPet.energy < 10}
              >
                <Gamepad2 className="w-6 h-6" />
                <span>Играть</span>
              </Button>
              <Button
                onClick={restPet}
                variant="outline"
                className="h-20 flex flex-col gap-2"
                disabled={userPet.energy >= 100}
              >
                <Moon className="w-6 h-6" />
                <span>Отдыхать</span>
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Приют (выбор и покупка нового питомца)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-accent/5 w-full">
          <h2 className="text-xl font-bold mb-2">🏠 Приют для питомцев</h2>
          <p className="text-muted-foreground">
            Выбери себе друга! Ухаживай за ним, и он будет радовать тебя каждый день.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Star className="w-5 h-5 text-accent fill-accent" />
            <span className="font-bold">{progress?.stars || 0} звёзд</span>
          </div>
        </Card>
      </div>

      {myPetsList.length > 0 && (
        <Button variant="ghost" onClick={() => setShowAdoptNew(false)}>
          ← Назад к моим питомцам
        </Button>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {pets.map((pet: any) => {
          const canAfford = (progress?.stars || 0) >= pet.price_stars;

          return (
            <Dialog
              key={pet.id}
              open={isDialogOpen && selectedPetToAdopt?.id === pet.id}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setSelectedPetToAdopt(null);
                  setPetName("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Card
                  className={`p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:scale-105 ${
                    !canAfford ? "opacity-60" : ""
                  }`}
                  onClick={() => {
                    setSelectedPetToAdopt(pet);
                    setIsDialogOpen(true);
                  }}
                >
                  <div className="text-5xl">{pet.icon}</div>
                  <h4 className="font-semibold">{pet.name}</h4>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-accent fill-accent" />
                    <span>{pet.price_stars}</span>
                  </div>
                </Card>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-center">
                    <span className="text-6xl block mb-4">{pet.icon}</span>
                    Завести {pet.name.toLowerCase()}?
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Как назовём питомца?</label>
                    <Input
                      placeholder="Введи имя..."
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Стоимость:</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 text-accent fill-accent" />
                      <span className="font-bold">{pet.price_stars}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    disabled={!canAfford || !petName.trim()}
                    onClick={handleAdopt}
                  >
                    {canAfford ? "Забрать домой 🏠" : "Недостаточно звёзд"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
    </div>
  );
};
