import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useVirtualHome, Pet, UserPet } from "@/hooks/useVirtualHome";
import { useUserProgress } from "@/hooks/useUserProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Utensils, Gamepad2, Moon, Star, Plus, Volume2, Sparkles, Ticket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PetQuizGame } from "./PetQuizGame";

export const PetCare = () => {
  const {
    pets,
    userPet,
    userPets,
    selectPet,
    loading,
    adoptPet,
    feedPet,
    restPet,
    useGameTicket,
  } = useVirtualHome();

  const { progress } = useUserProgress();
  const [petName, setPetName] = useState("");
  const [selectedPetToAdopt, setSelectedPetToAdopt] = useState<Pet | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showAdoptNew, setShowAdoptNew] = useState(false);

  // Состояние игровой комнаты
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const tickets = (progress as any)?.game_tickets || 0;

  // Все питомцы пользователя
  const myPetsList = userPets.length > 0 ? userPets : (userPet ? [userPet] : []);

  // Обработчик покупки питомца
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

  // Обработчик кнопки "Играть"
  const handleStartPlay = async () => {
    if (useGameTicket) {
      const hasTicket = await useGameTicket();
      if (hasTicket) {
        setIsGameModalOpen(true);
      }
    } else {
      setIsGameModalOpen(true);
    }
  };

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  // Если у пользователя есть хотя бы один питомец и не нажата кнопка "Ещё питомец"
  if (myPetsList.length > 0 && !showAdoptNew) {
    return (
      <div className="space-y-6">
        {/* Переключатель питомцев */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {myPetsList.map((item: UserPet, idx: number) => {
            const isSelected = userPet?.id === item.id || (!userPet && idx === 0);
            return (
              <Button
                key={item.id || idx}
                variant={isSelected ? "default" : "outline"}
                className="rounded-full flex items-center gap-2"
                onClick={() => selectPet(item)}
              >
                <span>{item.pets?.icon || "🐾"}</span>
                <span>{item.pet_name}</span>
              </Button>
            );
          })}

          <Button
            variant="outline"
            className="rounded-full border-2 border-dashed border-primary/50 text-primary flex items-center gap-1"
            onClick={() => setShowAdoptNew(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Ещё питомец</span>
          </Button>
        </div>

        {/* Экран активного питомца */}
        {userPet && (
          <>
            <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="text-8xl mb-4 animate-bounce-gentle">{userPet.pets?.icon || "🐾"}</div>
              <h2 className="text-2xl font-bold mb-1">{userPet.pet_name}</h2>
              <p className="text-muted-foreground text-sm">{userPet.pets?.species || userPet.pets?.name}</p>
            </Card>

            {/* Характеристики */}
            <div className="grid gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span className="font-semibold">Счастье</span>
                  <span className="ml-auto font-bold">{userPet.happiness}%</span>
                </div>
                <Progress value={userPet.happiness} className="h-3" />
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Utensils className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold">Сытость</span>
                  <span className="ml-auto font-bold">{userPet.hunger}%</span>
                </div>
                <Progress value={userPet.hunger} className="h-3" />
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Moon className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold">Энергия</span>
                  <span className="ml-auto font-bold">{userPet.energy}%</span>
                </div>
                <Progress value={userPet.energy} className="h-3" />
              </Card>
            </div>

            {/* Действия */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={feedPet}
                variant="outline"
                className="h-20 flex flex-col gap-1"
                disabled={userPet.hunger >= 100 || (progress?.stars || 0) < 1}
              >
                <Utensils className="w-6 h-6 text-orange-500" />
                <span className="font-medium">Покормить</span>
                <span className="text-xs text-muted-foreground">(1 ⭐)</span>
              </Button>

              <Button
                onClick={handleStartPlay}
                variant="default"
                className="h-20 flex flex-col gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Gamepad2 className="w-6 h-6" />
                <span className="font-medium">Играть</span>
                <span className="text-xs text-amber-200 font-semibold">(1 🎟️)</span>
              </Button>

              <Button
                onClick={restPet}
                variant="outline"
                className="h-20 flex flex-col gap-1"
                disabled={userPet.energy >= 100}
              >
                <Moon className="w-6 h-6 text-blue-500" />
                <span className="font-medium">Отдыхать</span>
                <span className="text-xs text-muted-foreground">(бесплатно)</span>
              </Button>
            </div>
          </>
        )}

        {/* Модальное окно игровой комнаты */}
        <Dialog open={isGameModalOpen} onOpenChange={setIsGameModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Gamepad2 className="w-6 h-6 text-indigo-600" /> Игровая комната
              </DialogTitle>
              <DialogDescription>
                Выберите мини-игру для питомца! (Осталось билетов: {tickets} 🎟️)
              </DialogDescription>
            </DialogHeader>

            {!selectedGame ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <Card 
                  onClick={() => setSelectedGame("quiz")}
                  className="p-4 cursor-pointer hover:border-indigo-500 transition-all border-2 flex flex-col items-center text-center gap-2"
                >
                  <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                    <Volume2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-lg">Учёный Питомец</h3>
                  <p className="text-xs text-muted-foreground">Викторина с озвучкой вопросов по урокам!</p>
                </Card>

                <Card 
                  onClick={() => setSelectedGame("quiz")}
                  className="p-4 cursor-pointer hover:border-indigo-500 transition-all border-2 flex flex-col items-center text-center opacity-80"
                >
                  <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-lg">Тренировка памяти</h3>
                  <p className="text-xs text-muted-foreground">Мини-игра на запоминание картинок</p>
                </Card>
              </div>
            ) : (
              <div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedGame(null)} className="mb-4">
                  ← Назад к выбору игр
                </Button>
                {selectedGame === "quiz" && <PetQuizGame />}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Экран приюта
  return (
    <div className="space-y-6">
      <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-accent/5 w-full">
        <h2 className="text-xl font-bold mb-2">🏠 Приют для питомцев</h2>
        <p className="text-muted-foreground text-sm">
          Выбери себе друга! Ухаживай за ним, и он будет радовать тебя каждый день.
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span className="font-bold">{progress?.stars || 0} звёзд</span>
        </div>
      </Card>

      {myPetsList.length > 0 && (
        <Button variant="ghost" onClick={() => setShowAdoptNew(false)}>
          ← Назад к моим питомцам
        </Button>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {pets.map((pet: Pet) => {
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
                  <h4 className="font-semibold">{pet.name || pet.species}</h4>
                  <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                    <Star className="w-4 h-4 fill-amber-500" />
                    <span>{pet.price_stars}</span>
                  </div>
                </Card>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-center">
                    <span className="text-6xl block mb-4">{pet.icon}</span>
                    Завести {(pet.name || pet.species).toLowerCase()}?
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
                    <div className="flex items-center gap-1 font-bold text-amber-600">
                      <Star className="w-5 h-5 fill-amber-500" />
                      <span>{pet.price_stars}</span>
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
