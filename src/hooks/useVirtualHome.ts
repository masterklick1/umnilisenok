import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useToast } from "@/hooks/use-toast";

export interface RoomItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  price_stars: number;
  category: string;
}

export interface Pet {
  id: string;
  name?: string;
  species: string;
  icon: string;
  price_stars: number;
}

export interface PetAccessory {
  id: string;
  name: string;
  icon: string;
  price_stars: number;
  type: "hat" | "glasses" | "clothes" | "accessory";
}

export interface UserPetAccessory {
  id: string;
  user_id: string;
  accessory_id: string;
  pet_accessories?: PetAccessory;
}

export interface UserRoomItem {
  id: string;
  user_id: string;
  item_id: string;
  room_items?: RoomItem;
}

export interface UserPet {
  id: string;
  user_id: string;
  pet_id: string;
  pet_name: string;
  hunger: number;
  happiness: number;
  energy: number;
  cleanliness: number;
  equipped_accessory_id?: string | null;
  last_fed_at?: string;
  last_played_at?: string;
  last_slept_at?: string;
  last_cleaned_at?: string;
  pets?: Pet;
  equipped_accessory?: PetAccessory;
}

export const useVirtualHome = () => {
  const { user } = useAuth();
  const { progress, refetch: refetchProgress } = useUserProgress();
  const { toast } = useToast();

  const [roomItems, setRoomItems] = useState<RoomItem[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [accessories, setAccessories] = useState<PetAccessory[]>([]);
  const [userRoomItems, setUserRoomItems] = useState<UserRoomItem[]>([]);
  const [userPets, setUserPets] = useState<UserPet[]>([]);
  const [userAccessories, setUserAccessories] = useState<UserPetAccessory[]>([]);
  const [userPet, setUserPet] = useState<UserPet | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Переключение активного питомца
  const selectPet = (pet: UserPet) => {
    setUserPet(pet);
  };

  // Проверка активности учёбы
  const applyStudyInactivityPenalty = useCallback(
    async (currentPet: UserPet, lastLessonDateStr?: string) => {
      if (!lastLessonDateStr) return;

      const lastLessonDate = new Date(lastLessonDateStr).getTime();
      const now = new Date().getTime();
      const hoursSinceLesson = (now - lastLessonDate) / (1000 * 60 * 60);

      if (hoursSinceLesson >= 24) {
        const daysMissed = Math.floor(hoursSinceLesson / 24);
        const penalty = daysMissed * 15;
        const newHappiness = Math.max(0, currentPet.happiness - penalty);

        if (newHappiness !== currentPet.happiness) {
          await supabase
            .from("user_pets")
            .update({ happiness: newHappiness })
            .eq("id", currentPet.id);
        }
      }
    },
    []
  );

  // Загрузка всех данных
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      const [
        { data: itemsData },
        { data: petsData },
        { data: userItemsData },
        { data: userPetsData },
        { data: accessoriesData },
        { data: userAccData },
        { data: progressData }
      ] = await Promise.all([
        supabase.from("room_items").select("*"),
        supabase.from("pets").select("*"),
        supabase.from("user_room_items").select("*, room_items(*)").eq("user_id", user.id),
        supabase.from("user_pets").select("*, pets(*)").eq("user_id", user.id),
        supabase.from("pet_accessories").select("*"),
        supabase.from("user_pet_accessories").select("*, pet_accessories(*)").eq("user_id", user.id),
        supabase.from("user_progress").select("last_lesson_at").eq("user_id", user.id).maybeSingle()
      ]);

      if (itemsData) setRoomItems(itemsData);
      if (petsData) setPets(petsData);
      if (accessoriesData) setAccessories(accessoriesData);
      if (userItemsData) setUserRoomItems(userItemsData);
      if (userAccData) setUserAccessories(userAccData);

      if (userPetsData && userPetsData.length > 0) {
        setUserPets(userPetsData);

        const activePet = userPet
          ? userPetsData.find((p) => p.id === userPet.id) || userPetsData[0]
          : userPetsData[0];

        setUserPet(activePet);

        if (progressData?.last_lesson_at) {
          await applyStudyInactivityPenalty(activePet, progressData.last_lesson_at);
        }
      }
    } catch (error) {
      console.error("Ошибка загрузки данных виртуального дома:", error);
    } finally {
      setLoading(false);
    }
  }, [user, userPet, applyStudyInactivityPenalty]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Списание игрового билета перед началом игры
  const useGameTicket = async (): Promise<boolean> => {
    if (!user || !progress) return false;

    const tickets = (progress as any).game_tickets || 0;

    if (tickets < 1) {
      toast({
        title: "Нет игровых билетов! 🎟️",
        description: "Пройди урок по предмету, чтобы получить билет на игру!",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from("user_progress")
        .update({ game_tickets: tickets - 1 })
        .eq("user_id", user.id);

      if (error) throw error;

      await refetchProgress();
      return true;
    } catch (error: any) {
      toast({ title: "Ошибка использования билета", description: error.message, variant: "destructive" });
      return false;
    }
  };

  // Награда питомцу за пройденный урок (+20% счастья, +3 ⭐ и +1 🎟️ билет)
  const completeLessonReward = async () => {
    if (!user || !progress) return;

    try {
      const currentTickets = (progress as any).game_tickets || 0;

      const { error: starError } = await supabase
        .from("user_progress")
        .update({
          stars: progress.stars + 3,
          game_tickets: currentTickets + 1,
          last_lesson_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (starError) throw starError;

      if (userPet) {
        const newHappiness = Math.min(100, userPet.happiness + 20);
        const { error: petError } = await supabase
          .from("user_pets")
          .update({ happiness: newHappiness })
          .eq("id", userPet.id);

        if (petError) throw petError;

        toast({
          title: "Урок пройден! 📚✨ (+3 ⭐, +1 🎟️)",
          description: `${userPet.pet_name} невероятно рад твоим успехом! (+20% счастья)`,
        });
      } else {
        toast({
          title: "Урок пройден! 📚✨",
          description: "Тебе начислено +3 ⭐ и +1 🎟️ билет!",
        });
      }

      await fetchData();
      await refetchProgress();
    } catch (error: any) {
      console.error("Ошибка при вручении награды за урок:", error.message);
    }
  };

  // Покупка аксессуара / одежды
  const buyAccessory = async (acc: PetAccessory) => {
    if (!user || !progress) return false;

    if (progress.stars < acc.price_stars) {
      toast({
        title: "Недостаточно звёзд ⭐",
        description: `Для покупки нужно ${acc.price_stars} ⭐`,
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error: starError } = await supabase
        .from("user_progress")
        .update({ stars: progress.stars - acc.price_stars })
        .eq("user_id", user.id);

      if (starError) throw starError;

      const { error: accError } = await supabase
        .from("user_pet_accessories")
        .insert({ user_id: user.id, accessory_id: acc.id });

      if (accError) throw accError;

      toast({
        title: "Новый стиль! 🎩",
        description: `Вы купили "${acc.name}" (-${acc.price_stars} ⭐)`,
      });

      await fetchData();
      await refetchProgress();
      return true;
    } catch (error: any) {
      toast({ title: "Ошибка покупки", description: error.message, variant: "destructive" });
      return false;
    }
  };

  // Надеть / снять аксессуар
  const equipAccessory = async (accessoryId: string | null) => {
    if (!user || !userPet) return;

    try {
      const { error } = await supabase
        .from("user_pets")
        .update({ equipped_accessory_id: accessoryId })
        .eq("id", userPet.id);

      if (error) throw error;

      toast({
        title: "Стиль обновлён! ✨",
        description: accessoryId ? "Питомец принарядился!" : "Аксессуар снят.",
      });

      await fetchData();
    } catch (error: any) {
      toast({ title: "Ошибка гардероба", description: error.message, variant: "destructive" });
    }
  };

  // Покупка предмета интерьера
  const buyItem = async (item: RoomItem) => {
    if (!user || !progress) return false;

    if (progress.stars < item.price_stars) {
      toast({
        title: "Недостаточно звёзд ⭐",
        description: `Для покупки нужно ${item.price_stars} ⭐`,
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error: starError } = await supabase
        .from("user_progress")
        .update({ stars: progress.stars - item.price_stars })
        .eq("user_id", user.id);

      if (starError) throw starError;

      const { error: itemError } = await supabase
        .from("user_room_items")
        .insert({ user_id: user.id, item_id: item.id });

      if (itemError) throw itemError;

      toast({
        title: "Покупка совершена! 🛋️",
        description: `Вы купили "${item.name}" (-${item.price_stars} ⭐)`,
      });

      await fetchData();
      await refetchProgress();
      return true;
    } catch (error: any) {
      toast({ title: "Ошибка покупки", description: error.message, variant: "destructive" });
      return false;
    }
  };

  // Покупка / усыновление питомца
  const adoptPet = async (pet: Pet, petName: string) => {
    if (!user || !progress) return false;

    if (progress.stars < pet.price_stars) {
      toast({
        title: "Недостаточно звёзд ⭐",
        description: `Вам нужно ${pet.price_stars} ⭐, чтобы забрать питомца.`,
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error: starError } = await supabase
        .from("user_progress")
        .update({ stars: progress.stars - pet.price_stars })
        .eq("user_id", user.id);

      if (starError) throw starError;

      const { error: petError } = await supabase.from("user_pets").insert({
        user_id: user.id,
        pet_id: pet.id,
        pet_name: petName,
        hunger: 80,
        happiness: 80,
        energy: 100,
        cleanliness: 100,
      });

      if (petError) throw petError;

      toast({
        title: "Поздравляем с новым другом! 🐾",
        description: `${petName} успешно переехал в ваш дом! (-${pet.price_stars} ⭐)`,
      });

      await fetchData();
      await refetchProgress();
      return true;
    } catch (error: any) {
      toast({ title: "Ошибка усыновления", description: error.message, variant: "destructive" });
      return false;
    }
  };

  // Покормить питомца
  const feedPet = async () => {
    if (!user || !userPet || !progress) return;

    if (progress.stars < 1) {
      toast({
        title: "Недостаточно звёзд ⭐",
        description: "Кормление стоит 1 ⭐",
        variant: "destructive",
      });
      return;
    }

    try {
      const newHunger = Math.min(100, userPet.hunger + 25);
      const newHappiness = Math.min(100, userPet.happiness + 5);

      const { error: starError } = await supabase
        .from("user_progress")
        .update({ stars: progress.stars - 1 })
        .eq("user_id", user.id);

      if (starError) throw starError;

      const { error } = await supabase
        .from("user_pets")
        .update({
          hunger: newHunger,
          happiness: newHappiness,
          last_fed_at: new Date().toISOString(),
        })
        .eq("id", userPet.id);

      if (error) throw error;

      toast({
        title: "Вкусняшка! 🍎 (-1 ⭐)",
        description: `${userPet.pet_name} сыт и доволен!`,
      });

      await fetchData();
      await refetchProgress();
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  };

  // Поиграть с питомцем
  const playWithPet = async () => {
    if (!user || !userPet || !progress) return;

    if (userPet.energy < 15) {
      toast({
        title: "Питомец устал 😴",
        description: `${userPet.pet_name} совсем без сил. Отправьте его отдыхать!`,
        variant: "destructive",
      });
      return;
    }

    try {
      const newHappiness = Math.min(100, userPet.happiness + 20);
      const newEnergy = Math.max(0, userPet.energy - 20);
      const newHunger = Math.max(0, userPet.hunger - 10);

      const { error: starError } = await supabase
        .from("user_progress")
        .update({ stars: progress.stars + 1 })
        .eq("user_id", user.id);

      if (starError) throw starError;

      const { error } = await supabase
        .from("user_pets")
        .update({
          happiness: newHappiness,
          energy: newEnergy,
          hunger: newHunger,
          last_played_at: new Date().toISOString(),
        })
        .eq("id", userPet.id);

      if (error) throw error;

      toast({
        title: "Весёлая игра! 🎾 (+1 ⭐)",
        description: `Вы отлично провели время с ${userPet.pet_name}!`,
      });

      await fetchData();
      await refetchProgress();
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  };

  // Отправить отдыхать
  const restPet = async () => {
    if (!user || !userPet) return;

    try {
      const { error } = await supabase
        .from("user_pets")
        .update({
          energy: 100,
          last_slept_at: new Date().toISOString(),
        })
        .eq("id", userPet.id);

      if (error) throw error;

      toast({
        title: "Сладких снов! 💤",
        description: `${userPet.pet_name} отдохнул и опять полон сил!`,
      });

      await fetchData();
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  };

  // Убрать за питомцем
  const cleanPet = async () => {
    if (!user || !userPet) return;

    try {
      const { error } = await supabase
        .from("user_pets")
        .update({
          cleanliness: 100,
          last_cleaned_at: new Date().toISOString(),
        })
        .eq("id", userPet.id);

      if (error) throw error;

      toast({
        title: "Чистота и порядок! 🧼",
        description: `В домике у ${userPet.pet_name} теперь свежо!`,
      });

      await fetchData();
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  };

  return {
    roomItems,
    pets,
    accessories,
    userRoomItems,
    userPets,
    userPet,
    userAccessories,
    loading,
    selectPet,
    useGameTicket,
    buyItem,
    buyAccessory,
    equipAccessory,
    adoptPet,
    feedPet,
    playWithPet,
    restPet,
    cleanPet,
    completeLessonReward,
    refetch: fetchData,
  };
};
