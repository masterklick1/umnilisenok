import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

type GalleryOwner = { id: string; local: boolean };

export type Drawing = {
  id: string;
  title: string;
  image_data: string;
  created_at: string | null;
};

export function useGalleryOwner(): GalleryOwner | null {
  const { user, isDemo } = useAuth();
  const { isParent, loading } = useUserRole();
  if (!user || (!isDemo && loading)) return null;
  const childId = isParent ? sessionStorage.getItem("activeChildId") : null;
  if (childId && childId !== user.id) return { id: `${user.id}:${childId}`, local: true };
  return { id: user.id, local: isDemo };
}

const prefix = (owner: GalleryOwner) => `fox-drawings:${owner.id}:`;

export async function listDrawings(owner: GalleryOwner, limit?: number): Promise<Drawing[]> {
  if (owner.local) {
    const drawings = Object.keys(localStorage).flatMap((key) => {
      if (!key.startsWith(prefix(owner))) return [];
      try {
        const drawing = JSON.parse(localStorage.getItem(key) ?? "null");
        return typeof drawing?.id === "string" && typeof drawing?.image_data === "string" ? [drawing as Drawing] : [];
      } catch {
        return [];
      }
    });
    return drawings.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, limit);
  }
  const query = supabase.from("gallery_items")
    .select("id, title, image_data, created_at")
    .eq("user_id", owner.id)
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });
  if (limit) query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function saveDrawing(owner: GalleryOwner, drawing: Drawing) {
  if (owner.local) {
    localStorage.setItem(prefix(owner) + drawing.id, JSON.stringify(drawing));
    return;
  }
  const { error } = await supabase.from("gallery_items").insert({
    ...drawing, category: "drawing", user_id: owner.id,
  });
  if (error && error.code !== "23505") throw error;
}

export async function deleteDrawing(owner: GalleryOwner, id: string) {
  if (owner.local) {
    localStorage.removeItem(prefix(owner) + id);
    return;
  }
  const { error } = await supabase.from("gallery_items").delete().eq("user_id", owner.id).eq("id", id);
  if (error) throw error;
}
