import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Pet {
  id: string;
  name?: string;
  species?: string;
  icon: string;
  price_stars: number;
}

export interface UserPet {
  id: string;
  user_id: string;
  pet_id: string;
  pet_name: string;
  happiness: number;
  hunger: number;
  energy: number;
  pets?: Pet;
}

export interface RoomItem {
  id: string;
  name: string;
  icon: string;
  price_stars: number;
  description?: string;
  category?: string;
}

export interface UserRoomItem {
  id: string;
  user_id: string;
  item_id: string;
  room_items?: RoomItem;
}

export const useVirtualHome = () => {
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: progress } = await supabase
        .from("user_progress")
        .select("game_tickets")
        .eq("user_id", user.id)
        .single();

      const currentTickets = progress?.game_tickets || 0;

      if (currentTickets < 1) {
        toast({
          title: "Нет билетов! 🎟️",
          description: "Выполняйте задания, чтобы получить билеты на игры.",
          variant: "destructive",
        });
        return false;
      }

      // Списываем 1 билет
      await supabase
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
          title: "Недостаточно звёзд ⭐",
          description: `Нужно ${pet.price_stars} звёзд для покупки!`,
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
        title: "Поздравляем! 🎉",
        description: `Вы завели питомца по имени ${name}!`,
      });

      await fetchData();
      if (newPet) setUserPet(newPet as UserPet);
      return true;
    } catch (error) {
      console.error("Ошибка при адаптации питомца:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось завести питомца.",
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
          title: "Недостаточно звёзд ⭐",
          description: "Кормление стоит 1 звезду!",
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
        title: "Вкусно! 🥣",
        description: `${userPet.pet_name} покушал и рад!`,
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
        title: "Сладкие сны! 😴",
        description: `${userPet.pet_name} отдохнул и полон сил!`,
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
          title: "Недостаточно звёзд ⭐",
          description: `Предмет стоит ${item.price_stars} звёзд!`,
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
        title: "Успешно! 🛒",
        description: `Вы купили ${item.name}!`,
      });

      await fetchData();
      return true;
    } catch (error) {
      console.error("Ошибка при покупке предмета:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось купить предмет.",
        variant: "destructive",
      });
      return false;
    }
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
    useGameTicket,
    playWithPet,
    refetch: fetchData,
  };
};
