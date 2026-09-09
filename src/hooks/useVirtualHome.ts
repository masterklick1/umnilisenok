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
  last_fed_at?: string;
  last_played_at?: string;
  last_slept_at?: string;
  last_cleaned_at?: string;
  pets?: Pet;
}

export const useVirtualHome = () => {
  const { user } = useAuth();
  const { progress, refetch: refetchProgress } = useUserProgress();
  const { toast } = useToast();

  const [roomItems, setRoomItems] = useState<RoomItem[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [userRoomItems, setUserRoomItems] = useState<UserRoomItem[]>([]);
  const [userPets, setUserPets] = useState<UserPet[]>([]);
  const [userPet, setUserPet] = useState<UserPet | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Переключение активного питомца
  const selectPet = (pet: UserPet) => {
    setUserPet(pet);
  };

  // Проверка активности учёбы: если уроки не проходились > 24 часов, снижаем счастье
  const applyStudyInactivityPenalty = useCallback(
    async (currentPet: UserPet, lastLessonDateStr?: string) => {
      if (!lastLessonDateStr) return;

      const lastLessonDate = new Date(lastLessonDateStr).getTime();
      const now = new Date().getTime();
      const hoursSinceLesson = (now - lastLessonDate) / (1000 * 60 * 60);

      // За каждые 24 часа без уроков снижаем счастье на 15%
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
        { data: progressData }
      ] = await Promise.all([
        supabase.from("room_items").select("*"),
        supabase.from("pets").select("*"),
        supabase.from("user_room_items").select("*, room_items(*)").eq("user_id", user.id),
        supabase.from("user_pets").select("*, pets(*)").eq("user_id", user.id),
        supabase.from("user_progress").select("last_lesson_at").eq("user_id", user.id).maybeSingle()
      ]);

      if (itemsData) setRoomItems(itemsData);
      if (petsData) setPets(petsData);
      if (userItemsData) setUserRoomItems(userItemsData);

      if (userPetsData && userPetsData.length > 0) {
        setUserPets(userPetsData);
        
        // Держим текущего выбранного питомца или берём первого
        const activePet = userPet 
          ? userPetsData.find((p) => p.id === userPet.id) || userPetsData[0] 
          : userPetsData[0];

        setUserPet(activePet);

        // Проверяем штраф за отсутствие уроков
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

  // Награда питомцу за пройденный урок (+20% счастья и +3 ⭐ пользователю)
  const completeLessonReward = async () => {
    if (!user || !progress) return;

    try {
      // 1. Начисляем +3 звезды за урок
      const { error: starError } = await supabase
        .from("user_progress")
        .update({
          stars: progress.stars + 3,
          last_lesson_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (starError) throw starError;

      // 2. Если есть питомец — поднимаем ему счастье на +20%
      if (userPet) {
        const newHappiness = Math.min(100, userPet.happiness + 20);
        const { error: petError } = await supabase
          .from("user_pets")
          .update({ happiness: newHappiness })
          .eq("id", userPet.id);

        if (petError) throw petError;

        toast({
          title: "Урок пройден! 📚✨ (+3 ⭐)",
          description: `${userPet.pet_name} невероятно рад твоим успехам! (+20% счастья)`,
        });
      } else {
        toast({
          title: "Урок пройден! 📚✨",
          description: "Тебе начислено +3 ⭐",
        });
      }

      await fetchData();
      await refetchProgress();
    } catch (error: any) {
      console.error("Ошибка при вручении награды за урок:", error.message);
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
      // 1. Списываем звезды
      const { error: starError } = await supabase
        .from("user_progress")
        .update({ stars: progress.stars - item.price_stars })
        .eq("user_id", user.id);

      if (starError) throw starError;

      // 2. Добавляем предмет пользователю
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
      // 1. Списываем звезды
      const { error: starError } = await supabase
        .from("user_progress")
        .update({ stars: progress.stars - pet.price_stars })
        .eq("user_id", user.id);

      if (starError) throw starError;

      // 2. Создаем питомца
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

  // Покормить питомца: тратит 1 ⭐, дает +25% сытости и +5% счастья
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

      // 1. Списываем 1 звезду
      const { error: starError } = await supabase
        .from("user_progress")
        .update({ stars: progress.stars - 1 })
        .eq("user_id", user.id);

      if (starError) throw starError;

      // 2. Обновляем показатели питомца
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

  // Поиграть с питомцем: тратит 20% энергии и 10% сытости, начисляет +1 ⭐ и дает +20% счастья
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

      // 1. Начисляем +1 звезду
      const { error: starError } = await supabase
        .from("user_progress")
        .update({ stars: progress.stars + 1 })
        .eq("user_id", user.id);

      if (starError) throw starError;

      // 2. Обновляем показатели питомца
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

  // Отправить отдыхать: полностью восстанавливает энергию
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

  // Убрать за питомцем: восстанавливает чистоту
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
    userRoomItems,
    userPets,
    userPet,
    loading,
    selectPet,
    buyItem,
    adoptPet,
    feedPet,
    playWithPet,
    restPet,
    cleanPet,
    completeLessonReward,
    refetch: fetchData,
  };
};
