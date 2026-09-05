import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";
interface ChildProfile {
  child_id: string;
  first_name: string | null;
  avatar_url: string | null;
  stars: number;
  level: number;
  experience: number;
  daily_streak: number;
  last_activity_at?: string | null;
  connected_via_invite?: boolean;
}

interface ChildActivity {
  id: string;
  child_id: string;
  activity_type: string;
  page_path: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface ChildAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string;
  last_analyzed_at: string;
}

interface GameSession {
  id: string;
  game_type: string;
  parent_id: string;
  child_id: string;
  status: string;
  current_turn: string | null;
  game_state: Record<string, unknown>;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useParentalControl = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [childActivities, setChildActivities] = useState<ChildActivity[]>([]);
  const [childAnalysis, setChildAnalysis] = useState<ChildAnalysis | null>(null);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [analyzingChild, setAnalyzingChild] = useState(false);

  // Fetch children with last activity + invite source
  const fetchChildren = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc("get_children_with_progress", {
        p_parent_id: user.id,
      });

      if (error) throw error;

      const baseChildren = (data || []) as ChildProfile[];
      const childIds = baseChildren.map((c) => c.child_id);

      if (childIds.length === 0) {
        setChildren([]);
        return;
      }

      const [{ data: activityRows }, { data: inviteRows }] = await Promise.all([
        supabase
          .from("child_activity")
          .select("child_id, created_at")
          .in("child_id", childIds)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("child_invites")
          .select("child_id")
          .eq("parent_id", user.id)
          .not("child_id", "is", null),
      ]);

      const lastActivityByChild = new Map<string, string>();
      (activityRows || []).forEach((row: { child_id: string; created_at: string }) => {
        if (!lastActivityByChild.has(row.child_id)) {
          lastActivityByChild.set(row.child_id, row.created_at);
        }
      });

      const inviteChildIds = new Set(
        (inviteRows || [])
          .map((row: { child_id: string | null }) => row.child_id)
          .filter(Boolean) as string[],
      );

      const enriched = baseChildren.map((child) => ({
        ...child,
        last_activity_at: lastActivityByChild.get(child.child_id) ?? null,
        connected_via_invite: inviteChildIds.has(child.child_id),
      }));

      enriched.sort((a, b) => {
        const aTime = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const bTime = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return bTime - aTime;
      });

      setChildren(enriched);
    } catch (error) {
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  useEffect(() => {
    if (!user?.id) return;
    const refresh = window.setInterval(fetchChildren, 15000);
    return () => window.clearInterval(refresh);
  }, [fetchChildren, user?.id]);

  // Create child account
  const createChildAccount = async (firstName: string, avatarUrl?: string) => {
    if (!user?.id) return { error: new Error("Not authenticated") };

    try {
      // Save current parent session
      const { data: sessionData } = await supabase.auth.getSession();
      const parentSession = sessionData.session;

      // Create a unique email for the child
      const childEmail = `child_${Date.now()}_${Math.random().toString(36).slice(2)}@internal.app`;
      const childPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

      const parentId = user.id;

      // Sign up the child
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: childEmail,
        password: childPassword,
        options: {
          data: {
            first_name: firstName,
            role: "child",
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Failed to create child account");

      const childId = signUpData.user.id;

      // Update child's profile with avatar and role
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          avatar_url: avatarUrl,
          role: "child" as const,
          first_name: firstName,
        })
        .eq("id", childId);

      if (profileError) console.error("Profile update error:", profileError);

      // Restore parent session BEFORE linking — signUp switches auth to child,
      // but link_parent_child requires auth.uid() = parent_id
      if (parentSession) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: parentSession.access_token,
          refresh_token: parentSession.refresh_token,
        });
        if (sessionError) throw sessionError;
      }

      const { error: linkError } = await supabase.rpc("link_parent_child", {
        p_parent_id: parentId,
        p_child_id: childId,
      });

      if (linkError) {
        // Fallback: direct insert under parent session (RLS allows parent insert)
        const { error: insertError } = await supabase
          .from("parent_child_links")
          .insert({ parent_id: parentId, child_id: childId });
        if (insertError) throw insertError;
      }

      toast({
        title: "Аккаунт создан! 🎉",
        description: `Аккаунт для ${firstName} успешно создан`,
      });

      await fetchChildren();
      return { error: null, childId };
    } catch (error) {
      console.error("Error creating child:", error);
      // Try to restore parent session on error too
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session || sessionData.session.user.id !== user.id) {
        // Session was switched, reload to recover
        window.location.reload();
      }
      toast({
        title: "Ошибка",
        description:
          error instanceof Error
            ? error.message
            : "Не удалось создать аккаунт ребёнка",
        variant: "destructive",
      });
      return { error };
    }
  };

  // Delete child account entirely (profile, data, auth user) — server-side verifies
  // that this child is actually linked to the requesting parent before deleting anything.
  const deleteChildAccount = async (childId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("delete-child-account", {
        body: { childId },
      });
      if (error) throw error;
      if ((data as { error?: string } | null)?.error) {
        throw new Error((data as { error: string }).error);
      }

      if (selectedChild === childId) setSelectedChild(null);
      await fetchChildren();

      toast({
        title: "Аккаунт удалён",
        description: "Аккаунт ребёнка и все его данные удалены безвозвратно.",
      });
      return { error: null };
    } catch (error) {
      console.error("Error deleting child account:", error);
      toast({
        title: "Не удалось удалить аккаунт",
        description: error instanceof Error ? error.message : "Попробуйте позже",
        variant: "destructive",
      });
      return { error };
    }
  };

  // Fetch child activities (for mirror)
  const fetchChildActivities = useCallback(async (childId: string) => {
    try {
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)("get_child_activities", {
        p_child_id: childId,
        p_limit: 50,
      });

      if (!rpcError) {
        setChildActivities((rpcData as unknown as ChildActivity[]) || []);
        return;
      }

      const { data, error } = await supabase
        .from("child_activity")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setChildActivities((data as ChildActivity[]) || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  }, []);

  // Realtime + polling for mirror (realtime alone is unreliable on mobile)
  useEffect(() => {
    if (!selectedChild) return;

    fetchChildActivities(selectedChild);

    const poll = window.setInterval(() => {
      fetchChildActivities(selectedChild);
    }, 5000);

    const channel = supabase
      .channel(`child-activity-${selectedChild}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "child_activity",
          filter: `child_id=eq.${selectedChild}`,
        },
        (payload) => {
          setChildActivities((prev) => [payload.new as ChildActivity, ...prev].slice(0, 50));
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [selectedChild, fetchChildActivities]);

  // Analyze child with AI
  const analyzeChild = async (childId: string) => {
    setAnalyzingChild(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-child", {
        body: { childId },
      });

      if (error) throw error;
      setChildAnalysis(data);
      
      toast({
        title: "Анализ готов! 🧠",
        description: "ИИ проанализировал успехи ребёнка",
      });
    } catch (error) {
      console.error("Error analyzing child:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось получить анализ",
        variant: "destructive",
      });
    } finally {
      setAnalyzingChild(false);
    }
  };

  // Fetch saved analysis
  const fetchChildAnalysis = useCallback(async (childId: string) => {
    try {
      const { data, error } = await supabase
        .from("child_analysis")
        .select("*")
        .eq("child_id", childId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setChildAnalysis({
          strengths: data.strengths as string[],
          weaknesses: data.weaknesses as string[],
          recommendations: data.recommendations || "",
          last_analyzed_at: data.last_analyzed_at || "",
        });
      }
    } catch (error) {
      console.error("Error fetching analysis:", error);
    }
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchChildAnalysis(selectedChild);
    }
  }, [selectedChild, fetchChildAnalysis]);

  // Game sessions
  const createGameSession = async (childId: string, gameType: string, initialState: Record<string, unknown>) => {
    if (!user?.id) return { error: new Error("Not authenticated") };

    try {
      const { data, error } = await supabase
        .from("game_sessions")
        .insert([{
          parent_id: user.id,
          child_id: childId,
          game_type: gameType,
          game_state: initialState as Json,
          current_turn: user.id,
          status: "active",
        }])
        .select()
        .single();

      if (error) throw error;
      return { error: null, session: data };
    } catch (error) {
      console.error("Error creating game:", error);
      return { error };
    }
  };

  const updateGameSession = async (sessionId: string, updates: Partial<Omit<GameSession, 'game_state'>> & { game_state?: Record<string, unknown> }) => {
    try {
      const { game_state, ...rest } = updates;
      const updateData = { 
        ...rest, 
        updated_at: new Date().toISOString(),
        ...(game_state && { game_state: game_state as Json }),
      };
      const { error } = await supabase
        .from("game_sessions")
        .update(updateData)
        .eq("id", sessionId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating game:", error);
    }
  };

  const fetchGameSessions = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("game_sessions")
        .select("*")
        .or(`parent_id.eq.${user.id},child_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setGameSessions((data as GameSession[]) || []);
    } catch (error) {
      console.error("Error fetching games:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGameSessions();

    if (!user?.id) return;

    const channel = supabase
      .channel("game-sessions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_sessions",
        },
        () => {
          fetchGameSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGameSessions, user?.id]);

  return {
    children,
    loading,
    selectedChild,
    setSelectedChild,
    createChildAccount,
    deleteChildAccount,
    childActivities,
    childAnalysis,
    analyzeChild,
    analyzingChild,
    gameSessions,
    createGameSession,
    updateGameSession,
    fetchGameSessions,
  };
};
