import { UserWelcome } from "@/components/UserWelcome";
import { SubjectCard } from "@/components/SubjectCard";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { UserAvatar } from "@/components/UserAvatar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Calculator, BookOpen, Leaf, Palette, Brain, ArrowLeft } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { ChildAccountBanner } from "@/components/child/ChildAccountBanner";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ToastAction } from "@/components/ui/toast";
import { SOSButton } from "@/components/SOSButton";
import { useActivityTracker } from "@/hooks/useActivityTracker";

export const MainApp = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { progress, loading } = useUserProgress();
  const { isChild, isParent, loading: roleLoading } = useUserRole();
  const [childName, setChildName] = useState<string>("");
  const [parentPlayMode, setParentPlayMode] = useState(false);

  useActivityTracker();

  useEffect(() => {
    if (!user?.id || roleLoading) return;

    const activeChildId = sessionStorage.getItem("activeChildId");
    const activeChildName = sessionStorage.getItem("activeChildName");

    if (isChild) {
      sessionStorage.setItem("activeChildId", user.id);
      if (activeChildName) setChildName(activeChildName);
      else {
        supabase
          .from("profiles")
          .select("first_name")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            const name = data?.first_name || "";
            sessionStorage.setItem("activeChildName", name);
            setChildName(name);
          });
      }
      setParentPlayMode(false);
      return;
    }

    if (isParent && activeChildId) {
      if (activeChildName) setChildName(activeChildName);
      setParentPlayMode(true);
      return;
    }

    if (isParent) {
      navigate("/parent");
    }
  }, [navigate, user?.id, isChild, isParent, roleLoading]);

  // Listen for game invitations from parent
  useEffect(() => {
    if (!user?.id) return;

    const gameTypeName: Record<string, string> = {
      tic_tac_toe: "Крестики-нолики",
      checkers: "Шашки",
      chess: "Шахматы",
    };

    const channel = supabase
      .channel(`invites-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_sessions",
          filter: `child_id=eq.${user.id}`,
        },
        (payload) => {
          const game = payload.new as { id: string; game_type: string };
          toast({
            title: "🎮 Папа/мама зовёт играть!",
            description: gameTypeName[game.game_type] || "Игра",
            duration: 15000,
            action: (
              <ToastAction altText="Играть" onClick={() => navigate(`/games/${game.id}`)}>
                Играть
              </ToastAction>
            ),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast, navigate]);


  const handleSubjectClick = (subject: string) => {
    toast({
      title: "Раздел в разработке 🚧",
      description: `Скоро здесь появятся уроки по теме "${subject}"`,
    });
  };

  const handleBackToParent = () => {
    sessionStorage.removeItem("activeChildId");
    sessionStorage.removeItem("activeChildName");
    navigate("/parent");
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl">🦊</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/5 pb-32">
      {/* Decorative background blobs */}
      <div className="blob bg-primary/40 w-72 h-72 -top-16 -left-16" />
      <div className="blob bg-secondary/40 w-80 h-80 top-1/3 -right-24" />
      <div className="blob bg-accent/40 w-64 h-64 bottom-10 left-1/4" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-2xl">
        {/* Header with Score, Level, Avatar and Parent Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ScoreDisplay score={progress?.stars || 0} />
            <div className="bg-card rounded-full px-4 py-2 shadow-md">
              <span className="text-sm font-bold text-primary">
                Уровень {progress?.level || 1}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserAvatar fallback={childName?.[0]?.toUpperCase() || "👤"} />
            {parentPlayMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToParent}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                К родителям
              </Button>
            )}
          </div>
        </div>

        {/* Welcome Message */}
        <UserWelcome name={childName} />

        {/* Fox Avatar */}
        <div className="flex justify-center my-10">
          <div className="relative animate-float">
            {/* glow rings */}
            <div className="absolute inset-0 -m-6 rounded-full bg-primary/20 blur-2xl animate-pulse-soft" />
            <div className="absolute inset-0 -m-3 rounded-full bg-gradient-to-br from-accent/40 to-secondary/40 blur-md" />
            <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center shadow-2xl ring-4 ring-white/60">
              <div className="text-8xl drop-shadow-lg">🦊</div>
            </div>
            {/* sparkles */}
            <div className="absolute -top-1 right-4 text-3xl" style={{ animation: "sparkle 2.5s ease-in-out infinite" }}>✨</div>
            <div className="absolute bottom-2 -left-2 text-2xl" style={{ animation: "sparkle 2.5s ease-in-out infinite 0.8s" }}>⭐</div>
            <div className="absolute top-6 -right-3 text-xl" style={{ animation: "sparkle 2.5s ease-in-out infinite 1.6s" }}>💫</div>
          </div>
        </div>

        {/* Subject Cards - Vertical List */}
        <div className="space-y-4">
          <SubjectCard
            icon={<Calculator className="w-8 h-8 text-blue-600" />}
            title="Математика"
            subtitle="Цифры и счёт 1-10"
            onClick={() => navigate("/math")}
            bgColor="bg-gradient-to-br from-blue-100 to-cyan-100"
            decorativeElements="1+1"
          />
          
          <SubjectCard
            icon={<BookOpen className="w-8 h-8 text-rose-600" />}
            title="Азбука"
            subtitle="Учим буквы"
            onClick={() => navigate("/alphabet")}
            bgColor="bg-gradient-to-br from-rose-100 to-orange-100"
            decorativeElements="АБВ"
          />
          
          <SubjectCard
            icon={<Leaf className="w-8 h-8 text-green-600" />}
            title="Мир вокруг"
            subtitle="Природа и животные"
            onClick={() => navigate("/world")}
            bgColor="bg-gradient-to-br from-green-100 to-emerald-100"
            decorativeElements="🌿"
          />
          
          <SubjectCard
            icon={<Palette className="w-8 h-8 text-purple-600" />}
            title="Творчество"
            subtitle="Рисуем и красим"
            onClick={() => navigate("/creativity")}
            bgColor="bg-gradient-to-br from-purple-100 to-pink-100"
            decorativeElements="🎨"
          />
          
          <SubjectCard
            icon={<Brain className="w-8 h-8 text-amber-600" />}
            title="Интеллект"
            subtitle="Пазлы и логика"
            onClick={() => navigate("/intellect")}
            bgColor="bg-gradient-to-br from-amber-100 to-yellow-100"
            decorativeElements="🧩"
          />
        </div>
      </div>

      {isChild && <ChildAccountBanner />}

      {/* SOS for emergencies */}
      <SOSButton />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};
