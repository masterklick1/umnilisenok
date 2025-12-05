import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserProgress } from "@/hooks/useUserProgress";

interface RoomItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  price_stars: number;
  width: number;
  height: number;
}

interface UserRoomItem {
  id: string;
  item_id: string;
  position_x: number;
  position_y: number;
  is_placed: boolean;
  room_items: RoomItem;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  icon: string;
  price_stars: number;
}

interface UserPet {
  id: string;
  pet_id: string;
  pet_name: string;
  happiness: number;
  hunger: number;
  energy: number;
  last_fed_at: string;
  last_played_at: string;
  pets: Pet;
}

interface GalleryItem {
  id: string;
  title: string;
  image_data: string;
  category: string;
  created_at: string;
}

export const useVirtualHome = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { progress, refetch: refetchProgress } = useUserProgress();
  
  const [roomItems, setRoomItems] = useState<RoomItem[]>([]);
  const [userRoomItems, setUserRoomItems] = useState<UserRoomItem[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [userPet, setUserPet] = useState<UserPet | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all available room items
      const { data: items } = await supabase
        .from("room_items")
        .select("*")
        .order("category", { ascending: true });
      setRoomItems(items || []);

      // Fetch user's owned items
      const { data: userItems } = await supabase
        .from("user_room_items")
        .select("*, room_items(*)")
        .eq("user_id", user.id);
      setUserRoomItems(userItems as UserRoomItem[] || []);

      // Fetch all available pets
      const { data: allPets } = await supabase
        .from("pets")
        .select("*")
        .order("price_stars", { ascending: true });
      setPets(allPets || []);

      // Fetch user's pet
      const { data: petData } = await supabase
        .from("user_pets")
        .select("*, pets(*)")
        .eq("user_id", user.id)
        .maybeSingle();
      setUserPet(petData as UserPet | null);

      // Fetch gallery items
      const { data: gallery } = await supabase
        .from("gallery_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setGalleryItems(gallery || []);

    } catch (error) {
      console.error("Error fetching virtual home data:", error);
    } finally {
      setLoading(false);
    }
  };

  const buyItem = async (item: RoomItem) => {
    if (!user || !progress) return false;

    if (progress.stars < item.price_stars) {
      toast({
        title: "Недостаточно звёзд",
        description: `Нужно ${item.price_stars} ⭐, у тебя ${progress.stars} ⭐`,
        variant: "destructive",
      });
      return false;
    }

    try {
      // Deduct stars
      const { error: updateError } = await supabase
        .from("user_progress")
        .update({ stars: progress.stars - item.price_stars })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Add item to user's inventory
      const { error: insertError } = await supabase
        .from("user_room_items")
        .insert({
          user_id: user.id,
          item_id: item.id,
        });

      if (insertError) throw insertError;

      toast({
        title: "Покупка успешна! 🎉",
        description: `Ты купил "${item.name}"`,
      });

      await fetchData();
      await refetchProgress();
      return true;
    } catch (error) {
      console.error("Error buying item:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось купить предмет",
        variant: "destructive",
      });
      return false;
    }
  };

  const placeItem = async (userItemId: string, x: number, y: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_room_items")
        .update({ position_x: x, position_y: y, is_placed: true })
        .eq("id", userItemId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error("Error placing item:", error);
    }
  };

  const removeItem = async (userItemId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_room_items")
        .update({ is_placed: false })
        .eq("id", userItemId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const adoptPet = async (pet: Pet, petName: string) => {
    if (!user || !progress) return false;

    if (userPet) {
      toast({
        title: "У тебя уже есть питомец!",
        description: "Ты можешь иметь только одного питомца",
        variant: "destructive",
      });
      return false;
    }

    if (progress.stars < pet.price_stars) {
      toast({
        title: "Недостаточно звёзд",
        description: `Нужно ${pet.price_stars} ⭐, у тебя ${progress.stars} ⭐`,
        variant: "destructive",
      });
      return false;
    }

    try {
      // Deduct stars
      const { error: updateError } = await supabase
        .from("user_progress")
        .update({ stars: progress.stars - pet.price_stars })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Add pet
      const { error: insertError } = await supabase
        .from("user_pets")
        .insert({
          user_id: user.id,
          pet_id: pet.id,
          pet_name: petName,
        });

      if (insertError) throw insertError;

      toast({
        title: "Поздравляем! 🎉",
        description: `${petName} теперь твой друг!`,
      });

      await fetchData();
      await refetchProgress();
      return true;
    } catch (error) {
      console.error("Error adopting pet:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось завести питомца",
        variant: "destructive",
      });
      return false;
    }
  };

  const feedPet = async () => {
    if (!user || !userPet) return;

    try {
      const newHunger = Math.min(100, userPet.hunger + 20);
      const newHappiness = Math.min(100, userPet.happiness + 5);

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
        title: "Вкусняшка! 🍎",
        description: `${userPet.pet_name} покушал и доволен!`,
      });

      await fetchData();
    } catch (error) {
      console.error("Error feeding pet:", error);
    }
  };

  const playWithPet = async () => {
    if (!user || !userPet) return;

    try {
      const newHappiness = Math.min(100, userPet.happiness + 15);
      const newEnergy = Math.max(0, userPet.energy - 10);

      const { error } = await supabase
        .from("user_pets")
        .update({
          happiness: newHappiness,
          energy: newEnergy,
          last_played_at: new Date().toISOString(),
        })
        .eq("id", userPet.id);

      if (error) throw error;

      toast({
        title: "Весело! 🎾",
        description: `${userPet.pet_name} радостно играет!`,
      });

      await fetchData();
    } catch (error) {
      console.error("Error playing with pet:", error);
    }
  };

  const restPet = async () => {
    if (!user || !userPet) return;

    try {
      const newEnergy = Math.min(100, userPet.energy + 25);

      const { error } = await supabase
        .from("user_pets")
        .update({ energy: newEnergy })
        .eq("id", userPet.id);

      if (error) throw error;

      toast({
        title: "Отдых 😴",
        description: `${userPet.pet_name} отдохнул и набрался сил!`,
      });

      await fetchData();
    } catch (error) {
      console.error("Error resting pet:", error);
    }
  };

  const saveToGallery = async (title: string, imageData: string, category: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("gallery_items")
        .insert({
          user_id: user.id,
          title,
          image_data: imageData,
          category,
        });

      if (error) throw error;

      toast({
        title: "Сохранено! 🎨",
        description: "Работа добавлена в галерею",
      });

      await fetchData();
      return true;
    } catch (error) {
      console.error("Error saving to gallery:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить работу",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteFromGallery = async (itemId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("gallery_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Удалено",
        description: "Работа удалена из галереи",
      });

      await fetchData();
    } catch (error) {
      console.error("Error deleting from gallery:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  return {
    roomItems,
    userRoomItems,
    pets,
    userPet,
    galleryItems,
    loading,
    buyItem,
    placeItem,
    removeItem,
    adoptPet,
    feedPet,
    playWithPet,
    restPet,
    saveToGallery,
    deleteFromGallery,
    refetch: fetchData,
  };
};
