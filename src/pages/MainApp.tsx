import AnimatedFox from "@/components/AnimatedFox";
import { UserWelcome } from "@/components/UserWelcome";
import { SubjectCard } from "@/components/SubjectCard";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { UserAvatar } from "@/components/UserAvatar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Calculator, BookOpen, BookOpenText, Leaf, Palette, Brain, ArrowLeft, Globe } from "lucide-react";
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
import { useIsWatch } from "@/hooks/useIsWatch";
import { WatchHome } from "@/components/child/WatchHome";
import { loadReadingSession } from "@/lib/reading-session";
import { READING_LEVEL_TITLES } from "@/lib/reading-items";
import { getActivityChildId } from "@/lib/activity-log";
import { TOYS_LESSON_PATH } from "@/lib/toys-lesson";
import { SchoolModeGuard } from "@/components/child/SchoolModeGuard";

export const MainApp = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isDemo, signOut } = useAuth();
  const { progress, loading } = useUserProgress();
  const { isChild, isParent, loading: roleLoading } = useUserRole();
  const [childName, setChildName] = useState<string>("");
  const [parentPlayMode, setParentPlayMode] = useState(false);
  const isWatch = useIsWatch();
  const readingSession = loadReadingSession(isChild ? user?.id ?? null : getActivityChildId(user?.id));
  const hasUnfinishedReading = readingSession && readingSession.index < readingSession.items.length;

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

  const openDemoAuth = async (mode: "login" | "register") => {
    await signOut();
    navigate(`/auth?mode=${mode}`, { replace: true });
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl">🦊</div>
      </div>
    );
  }

  // Детские Android-часы: крошечный экран — показываем только защиту (SOS + геолокация).
  // Геолокация и геозоны продолжают работать в фоне через ChildDeviceServices.
  if (isWatch && isChild && !isDemo) {
    return <WatchHome childName={childName} />;
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

        {isDemo && (
          <div className="mb-6 rounded-2xl border border-primary/20 bg-card/90 p-4 text-center shadow-md">
            <p className="font-bold text-primary">Демо-режим</p>
            <p className="text-sm text-muted-foreground">
              Можно заниматься без регистрации. Для родительского кабинета войдите или создайте аккаунт.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void openDemoAuth("login")}>Войти</Button>
              <Button size="sm" variant="secondary" onClick={() => void openDemoAuth("register")}>Зарегистрироваться</Button>
            </div>
          </div>
        )}

        <div className="relative mx-auto my-4 w-full max-w-60">
          <div aria-hidden="true" className="absolute inset-x-4 bottom-5 top-6 rounded-[45%] bg-[radial-gradient(ellipse_at_center,#ffe9c7,transparent_73%)]" />
          <div className="relative">
            <AnimatedFox size={240} />
          </div>
        </div>

        {/* Subject Cards - Vertical List (закрываются в школьные часы) */}
        <SchoolModeGuard>
        <div className="space-y-4">
          <Button
            size="lg"
            className="h-auto w-full justify-start gap-4 rounded-3xl p-5 text-left"
            onClick={() => navigate(hasUnfinishedReading ? "/reading?continue" : "/reading")}
          >
            <BookOpenText className="h-7 w-7 shrink-0" aria-hidden="true" />
            <span className="min-w-0 whitespace-normal">
              <span className="block text-lg font-bold">
                {hasUnfinishedReading ? "Продолжить занятие" : "Начать чтение"}
              </span>
              <span className="block text-sm font-normal">
                {hasUnfinishedReading ? READING_LEVEL_TITLES[readingSession.level] : "Буквы, слоги и первые слова"}
              </span>
            </span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-auto w-full justify-start gap-4 rounded-3xl border-teal-200 bg-teal-50 p-5 text-left text-teal-950 hover:bg-teal-100 hover:text-teal-950"
            onClick={() => navigate(TOYS_LESSON_PATH)}
          >
            <span className="text-3xl" aria-hidden="true">🧸</span>
            <span className="min-w-0 whitespace-normal">
              <span className="block text-lg font-bold">Русский через игру</span>
              <span className="block text-sm font-normal">Мои игрушки · послушай и покажи</span>
            </span>
          </Button>

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
            icon={<BookOpenText className="w-8 h-8 text-amber-600" />}
            title="Сказки"
            subtitle="Слушаем и отвечаем"
            onClick={() => navigate("/tales")}
            bgColor="bg-gradient-to-br from-amber-100 to-yellow-100"
            decorativeElements="📖"
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

          <SubjectCard
            icon={<Globe className="w-8 h-8 text-indigo-600" />}
            title="English"
            subtitle="Первые слова и алфавит"
            onClick={() => navigate("/english")}
            bgColor="bg-gradient-to-br from-indigo-100 to-sky-100"
            decorativeElements="ABC"
          />
        </div>
        </SchoolModeGuard>
      </div>

      {isChild && !isDemo && <ChildAccountBanner />}

      {/* SOS for emergencies */}
      <SOSButton />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};
