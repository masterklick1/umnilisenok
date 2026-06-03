import { UserWelcome } from "@/components/UserWelcome";
import { SubjectCard } from "@/components/SubjectCard";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { UserAvatar } from "@/components/UserAvatar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Calculator, BookOpen, Leaf, Palette, Brain, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ToastAction } from "@/components/ui/toast";
import { SOSButton } from "@/components/SOSButton";
import { useLocationTracker } from "@/hooks/useLocationTracker";
import { useMonitoringListener } from "@/hooks/useMonitoringListener";

export const MainApp = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { progress, loading } = useUserProgress();
  const [childName, setChildName] = useState<string>("");

  useLocationTracker(true);
  useMonitoringListener();


  useEffect(() => {
    // Check if we're in child session mode
    const activeChildId = sessionStorage.getItem("activeChildId");
    const activeChildName = sessionStorage.getItem("activeChildName");
    
    if (!activeChildId) {
      // No child session - redirect to parent dashboard
      navigate("/parent");
      return;
    }
    
    if (activeChildName) {
      setChildName(activeChildName);
    }
  }, [navigate]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl">🦊</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 pb-32">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToParent}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Родителям
            </Button>
          </div>
        </div>

        {/* Welcome Message */}
        <UserWelcome name={childName} />

        {/* Fox Avatar */}
        <div className="flex justify-center my-8">
          <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl animate-float">
            <div className="text-7xl">🦊</div>
          </div>
        </div>

        {/* Subject Cards - Vertical List */}
        <div className="space-y-4">
          <SubjectCard
            icon={<Calculator className="w-7 h-7 text-blue-600" />}
            title="Математика"
            subtitle="Цифры и счёт 1-10"
            onClick={() => navigate("/math")}
            bgColor="bg-blue-100"
            decorativeElements="1+1"
          />
          
          <SubjectCard
            icon={<BookOpen className="w-7 h-7 text-red-600" />}
            title="Азбука"
            subtitle="Учим буквы"
            onClick={() => navigate("/alphabet")}
            bgColor="bg-red-100"
            decorativeElements="АБВ"
          />
          
          <SubjectCard
            icon={<Leaf className="w-7 h-7 text-green-600" />}
            title="Мир вокруг"
            subtitle="Природа и животные"
            onClick={() => navigate("/world")}
            bgColor="bg-green-100"
            decorativeElements="🌿"
          />
          
          <SubjectCard
            icon={<Palette className="w-7 h-7 text-purple-600" />}
            title="Творчество"
            subtitle="Рисуем и красим"
            onClick={() => navigate("/creativity")}
            bgColor="bg-purple-100"
            decorativeElements="🎨"
          />
          
          <SubjectCard
            icon={<Brain className="w-7 h-7 text-orange-600" />}
            title="Интеллект"
            subtitle="Пазлы и логика"
            onClick={() => navigate("/intellect")}
            bgColor="bg-yellow-100"
            decorativeElements="🧩"
          />
        </div>
      </div>

      {/* SOS for emergencies */}
      <SOSButton />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};
