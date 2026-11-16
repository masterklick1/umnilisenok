import { useLanguage } from "@/contexts/LanguageContext";
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
import { getReadingLevelTitle } from "@/lib/reading-items";
import { getActivityChildId } from "@/lib/activity-log";
import { TOYS_LESSON_PATH } from "@/lib/toys-lesson";
import { SchoolModeGuard } from "@/components/child/SchoolModeGuard";

export const MainApp = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isDemo, signOut } = useAuth();
  const { progress, loading } = useUserProgress();
  const { isChild, isParent, loading: roleLoading } = useUserRole();
  const [childName, setChildName] = useState<string>("");
  const displayName = isDemo ? t("Демо", "Demo") : childName;
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
      tic_tac_toe: t("Крестики-нолики", "Tic-tac-toe"),
      checkers: t("Шашки", "Checkers"),
      chess: t("Шахматы", "Chess"),
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
            title: t("🎮 Папа/мама зовёт играть!", "🎮 Your parent wants to play!"),
            description: gameTypeName[game.game_type] || t("Игра", "Game"),
            duration: 15000,
            action: (
              <ToastAction altText={t("Играть", "Play")} onClick={() => navigate(`/games/${game.id}`)}>
                {t("Играть", "Play")}
              </ToastAction>
            ),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast, navigate, t]);

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
                {t("Уровень", "Level")} {progress?.level || 1}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserAvatar fallback={displayName?.[0]?.toUpperCase() || "👤"} />
            {parentPlayMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToParent}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("К родителям", "Back to parents")}
              </Button>
            )}
          </div>
        </div>

        {/* Welcome Message */}
        <UserWelcome name={displayName} />

        {isDemo && (
          <div className="mb-6 rounded-2xl border border-primary/20 bg-card/90 p-4 text-center shadow-md">
            <p className="font-bold text-primary">{t("Демо-режим", "Demo mode")}</p>
            <p className="text-sm text-muted-foreground">
              {t("Можно заниматься без регистрации. Для родительского кабинета войдите или создайте аккаунт.", "Try the lessons without an account. Sign in or sign up to open the parent dashboard.")}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void openDemoAuth("login")}>{t("Войти", "Sign in")}</Button>
              <Button size="sm" variant="secondary" onClick={() => void openDemoAuth("register")}>{t("Зарегистрироваться", "Sign up")}</Button>
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
                {hasUnfinishedReading ? t("Продолжить занятие", "Continue reading") : t("Начать чтение", "Start reading")}
              </span>
              <span className="block text-sm font-normal">
                {hasUnfinishedReading ? getReadingLevelTitle(readingSession.level, language) : t("Буквы, слоги и первые слова", "Letters, syllables and first words")}
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
              <span className="block text-lg font-bold">{t("Русский через игру", "Russian through play")}</span>
              <span className="block text-sm font-normal">{t("Мои игрушки · послушай и покажи", "My toys · listen and point")}</span>
            </span>
          </Button>

          <SubjectCard
            icon={<Calculator className="w-8 h-8 text-blue-600" />}
            title={t("Математика", "Math")}
            subtitle={t("Цифры и счёт 1-10", "Numbers and counting to 10")}
            onClick={() => navigate("/math")}
            bgColor="bg-gradient-to-br from-blue-100 to-cyan-100"
            decorativeElements="1+1"
          />
          
          <SubjectCard
            icon={<BookOpen className="w-8 h-8 text-rose-600" />}
            title={t("Азбука", "Russian alphabet")}
            subtitle={t("Учим буквы", "Learn Russian letters")}
            onClick={() => navigate("/alphabet")}
            bgColor="bg-gradient-to-br from-rose-100 to-orange-100"
            decorativeElements="АБВ"
          />

          <SubjectCard
            icon={<BookOpenText className="w-8 h-8 text-amber-600" />}
            title={t("Сказки", "Stories")}
            subtitle={t("Слушаем и отвечаем", "Listen and answer")}
            onClick={() => navigate("/tales")}
            bgColor="bg-gradient-to-br from-amber-100 to-yellow-100"
            decorativeElements="📖"
          />

          
          <SubjectCard
            icon={<Leaf className="w-8 h-8 text-green-600" />}
            title={t("Мир вокруг", "World around us")}
            subtitle={t("Природа и животные", "Nature and animals")}
            onClick={() => navigate("/world")}
            bgColor="bg-gradient-to-br from-green-100 to-emerald-100"
            decorativeElements="🌿"
          />
          
          <SubjectCard
            icon={<Palette className="w-8 h-8 text-purple-600" />}
            title={t("Творчество", "Arts and crafts")}
            subtitle={t("Рисуем и красим", "Draw and color")}
            onClick={() => navigate("/creativity")}
            bgColor="bg-gradient-to-br from-purple-100 to-pink-100"
            decorativeElements="🎨"
          />
          
          <SubjectCard
            icon={<Brain className="w-8 h-8 text-amber-600" />}
            title={t("Интеллект", "Brain games")}
            subtitle={t("Пазлы и логика", "Puzzles and logic")}
            onClick={() => navigate("/intellect")}
            bgColor="bg-gradient-to-br from-amber-100 to-yellow-100"
            decorativeElements="🧩"
          />

          <SubjectCard
            icon={<Globe className="w-8 h-8 text-indigo-600" />}
            title="English"
            subtitle={t("Первые слова и алфавит", "First words and the alphabet")}
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
