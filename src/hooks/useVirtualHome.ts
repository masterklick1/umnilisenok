import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Pet {
  id: string;
  name?: string;
  species?: string;
  icon: string;
  price_stars: number;
  unlock_achievement_id?: string | null;
}

export interface UserPet {
  id: string;
  user_id: string;
  pet_id: string;
  pet_name: string;
  happiness: number;
  hunger: number;
  energy: number;
  adopted_at?: string | null;
  pets?: Pet;
}

export interface RoomItem {
  id: string;
  name: string;
  icon: string;
  price_stars: number;
  description?: string;
  category?: string;
  unlock_subject?: string | null;
  unlock_count?: number | null;
  unlock_achievement_id?: string | null;
}

export interface UserRoomItem {
  id: string;
  user_id: string;
  item_id: string;
  room_items?: RoomItem;
}

export const useVirtualHome = () => {
  const { t } = useLanguage();
  const [pets, setPets] = useState<Pet[]>([]);
  const [roomItems, setRoomItems] = useState<RoomItem[]>([]);
  const [userPets, setUserPets] = useState<UserPet[]>([]);
  const [userPet, setUserPet] = useState<UserPet | null>(null);
  const [userRoomItems, setUserRoomItems] = useState<UserRoomItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Загрузка данных
  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Получаем каталоги
      const { data: petsData } = await supabase.from("pets").select("*");
      const { data: itemsData } = await supabase.from("room_items").select("*");

      if (petsData) setPets(petsData as Pet[]);
      if (itemsData) setRoomItems(itemsData as RoomItem[]);

      if (user) {
        // 2. Получаем питомцев пользователя
        const { data: myPets } = await supabase
          .from("user_pets")
          .select("*, pets(*)")
          .eq("user_id", user.id);

        if (myPets && myPets.length > 0) {
          const formattedPets = myPets as UserPet[];
          setUserPets(formattedPets);
          setUserPet(formattedPets[0]);
        } else {
          setUserPets([]);
          setUserPet(null);
        }

        // 3. Получаем мебель пользователя
        const { data: myItems } = await supabase
          .from("user_room_items")
          .select("*, room_items(*)")
          .eq("user_id", user.id);

        if (myItems) {
          setUserRoomItems(myItems as UserRoomItem[]);
        }
      }
    } catch (error) {
      console.error("Ошибка при загрузке данных виртуального дома:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Выбор активного питомца
  const selectPet = (pet: UserPet) => {
    setUserPet(pet);
  };

  // Проверка и списание билета для игры
  const useGameTicket = async (): Promise<boolean> => {
  const { t } = useLanguage();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: progress } = await (supabase as any)
        .from("user_progress")
        .select("game_tickets")
        .eq("user_id", user.id)
        .single();

      const currentTickets = progress?.game_tickets || 0;

      if (currentTickets < 1) {
        toast({
          title: t("Нет билетов! 🎟️", "No tickets left! 🎟️"),
          description: t("Выполняйте задания, чтобы получить билеты на игры.", "Finish activities to earn tickets for games."),
          variant: "destructive",
        });
        return false;
      }

      // Списываем 1 билет
      await (supabase as any)
        .from("user_progress")
        .update({ game_tickets: currentTickets - 1 })
        .eq("user_id", user.id);

      return true;
    } catch (err) {
      console.error("Ошибка при списании билета:", err);
      return false;
    }
  };

  // Покупка/Приют питомца
  const adoptPet = async (pet: Pet, name: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Проверяем звёзды
      const { data: progress } = await supabase
        .from("user_progress")
        .select("stars")
        .eq("user_id", user.id)
        .single();

      const currentStars = progress?.stars || 0;
      if (currentStars < pet.price_stars) {
        toast({
          title: t("Недостаточно звёзд ⭐", "Not enough stars ⭐"),
          description: t(`Нужно ${pet.price_stars} звёзд для покупки!`, `You need ${pet.price_stars} stars to adopt this pet.`),
          variant: "destructive",
        });
        return false;
      }

      // Списываем звёзды
      await supabase
        .from("user_progress")
        .update({ stars: currentStars - pet.price_stars })
        .eq("user_id", user.id);

      // Добавляем питомца
      const { data: newPet, error } = await supabase
        .from("user_pets")
        .insert({
          user_id: user.id,
          pet_id: pet.id,
          pet_name: name,
          happiness: 80,
          hunger: 80,
          energy: 100,
        })
        .select("*, pets(*)")
        .single();

      if (error) throw error;

      toast({
        title: t("Поздравляем! 🎉", "Congratulations! 🎉"),
        description: t(`Вы завели питомца по имени ${name}!`, `You adopted ${name}!`),
      });

      await fetchData();
      if (newPet) setUserPet(newPet as UserPet);
      return true;
    } catch (error) {
      console.error("Ошибка при адаптации питомца:", error);
      toast({
        title: t("Ошибка", "Error"),
        description: t("Не удалось завести питомца.", "Couldn’t adopt the pet."),
        variant: "destructive",
      });
      return false;
    }
  };

  // Кормление питомца (1 звезда)
  const feedPet = async () => {
    if (!userPet) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: progress } = await supabase
        .from("user_progress")
        .select("stars")
        .eq("user_id", user.id)
        .single();

      const currentStars = progress?.stars || 0;
      if (currentStars < 1) {
        toast({
          title: t("Недостаточно звёзд ⭐", "Not enough stars ⭐"),
          description: t("Кормление стоит 1 звезду!", "Feeding costs one star!"),
          variant: "destructive",
        });
        return;
      }

      const newHunger = Math.min(100, userPet.hunger + 30);
      const newHappiness = Math.min(100, userPet.happiness + 10);

      // Обновляем питомца и списываем 1 звезду
      await supabase
        .from("user_pets")
        .update({ hunger: newHunger, happiness: newHappiness })
        .eq("id", userPet.id);

      await supabase
        .from("user_progress")
        .update({ stars: currentStars - 1 })
        .eq("user_id", user.id);

      setUserPet((prev) =>
        prev ? { ...prev, hunger: newHunger, happiness: newHappiness } : null
      );

      toast({
        title: t("Вкусно! 🥣", "Yummy! 🥣"),
        description: t(`${userPet.pet_name} покушал и рад!`, `${userPet.pet_name} enjoyed the meal!`),
      });
    } catch (error) {
      console.error("Ошибка при кормлении:", error);
    }
  };

  // Отдых питомца
  const restPet = async () => {
    if (!userPet) return;

    try {
      const newEnergy = 100;
      await supabase
        .from("user_pets")
        .update({ energy: newEnergy })
        .eq("id", userPet.id);

      setUserPet((prev) => (prev ? { ...prev, energy: newEnergy } : null));

      toast({
        title: t("Сладкие сны! 😴", "Sweet dreams! 😴"),
        description: t(`${userPet.pet_name} отдохнул и полон сил!`, `${userPet.pet_name} is rested and full of energy!`),
      });
    } catch (error) {
      console.error("Ошибка при отдыхе:", error);
    }
  };

  // Покупка предмета интерьера
  const buyItem = async (item: RoomItem): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: progress } = await supabase
        .from("user_progress")
        .select("stars")
        .eq("user_id", user.id)
        .single();

      const currentStars = progress?.stars || 0;
      if (currentStars < item.price_stars) {
        toast({
          title: t("Недостаточно звёзд ⭐", "Not enough stars ⭐"),
          description: t(`Предмет стоит ${item.price_stars} звёзд!`, `This item costs ${item.price_stars} stars!`),
          variant: "destructive",
        });
        return false;
      }

      // Списываем звёзды
      await supabase
        .from("user_progress")
        .update({ stars: currentStars - item.price_stars })
        .eq("user_id", user.id);

      // Добавляем предмет пользователю
      await supabase.from("user_room_items").insert({
        user_id: user.id,
        item_id: item.id,
      });

      toast({
        title: t("Успешно! 🛒", "Purchased! 🛒"),
        description: t(`Вы купили ${item.name}!`, `You bought ${item.name}!`),
      });

      await fetchData();
      return true;
    } catch (error) {
      console.error("Ошибка при покупке предмета:", error);
      toast({
        title: t("Ошибка", "Error"),
        description: t("Не удалось купить предмет.", "Couldn’t buy the item."),
        variant: "destructive",
      });
      return false;
    }
  };

  // Получение награды за учёбу (проверка на сервере)
  const claimReward = async (item: RoomItem): Promise<boolean> => {
    const { data, error } = await supabase.rpc("claim_reward_item", { _item_id: item.id });
    if (error || !data) {
      toast({
        title: t("Пока рано 🦊", "Keep going 🦊"),
        description: t("Позанимайся ещё немного, и награда откроется!", "Keep practicing to unlock the reward!"),
        variant: "destructive",
      });
      return false;
    }
    toast({ title: t("Награда получена! 🎉", "Reward claimed! 🎉"), description: t(`${item.name} теперь в твоей комнате!`, `${item.name} is now in your room!`) });
    await fetchData();
    return true;
  };

  // Игра с питомцем (повышение счастья)
  const playWithPet = async () => {
    if (!userPet) return;
    try {
      const newHappiness = Math.min(100, userPet.happiness + 25);
      await supabase
        .from("user_pets")
        .update({ happiness: newHappiness })
        .eq("id", userPet.id);

      setUserPet((prev) => (prev ? { ...prev, happiness: newHappiness } : null));
    } catch (error) {
      console.error("Ошибка игры с питомцем:", error);
    }
  };

  return {
    pets,
    roomItems,
    userPets,
    userPet,
    userRoomItems,
    loading,
    selectPet,
    adoptPet,
    feedPet,
    restPet,
    buyItem,
    claimReward,
    useGameTicket,
    playWithPet,
    refetch: fetchData,
  };
};
