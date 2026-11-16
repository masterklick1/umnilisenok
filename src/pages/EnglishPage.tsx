import { useLanguage } from "@/contexts/LanguageContext";
import { StreakBonusBanner } from "@/components/StreakBonusBanner";
import { EnglishCourse } from "@/components/english/EnglishCourse";
import { SchoolModeGuard } from "@/components/child/SchoolModeGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Sparkles, Target, Circle, HelpCircle, Puzzle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EnglishPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const learner = user ? `${user.id}:${sessionStorage.getItem("activeChildId") || user.id}` : null;

  const handleModuleClick = (id: string, title: string) => {
    if (id === "abc") {
      navigate("/english/alphabet");
    } else if (id === "words") {
      navigate("/english/words");
    } else if (id === "quiz") {
      navigate("/english/quiz");
    } else if (id === "vowels") {
      navigate("/english/vowels");
    } else if (id === "missing") {
      navigate("/english/missing");
    } else if (id === "builder") {
      navigate("/english/builder");
    } else {
      toast({
        title: `${title} 🚀`,
        description: t("Урок скоро станет доступен!", "This lesson is coming soon!"),
      });
    }
  };

  const modules = [
    {
      id: "abc",
      title: t("ABC / Алфавит", "ABC / Alphabet"),
      subtitle: t("Все буквы от A до Z", "Every letter from A to Z"),
      icon: <BookOpen className="w-10 h-10 text-rose-500" />,
      bgColor: "bg-gradient-to-br from-rose-100 to-orange-100",
      borderColor: "border-rose-200",
    },
    {
      id: "words",
      title: t("Первые слова", "First words"),
      subtitle: t("Цвета, животные, цифры", "Colors, animals and numbers"),
      icon: <Sparkles className="w-10 h-10 text-amber-500" />,
      bgColor: "bg-gradient-to-br from-amber-100 to-yellow-100",
      borderColor: "border-amber-200",
    },
    {
      id: "builder",
      title: t("Собери слово", "Build a word"),
      subtitle: t("10 увлекательных уровней", "10 levels to explore"),
      icon: <Puzzle className="w-10 h-10 text-orange-500" />,
      bgColor: "bg-gradient-to-br from-orange-100 to-amber-100",
      borderColor: "border-orange-200",
    },
    {
      id: "quiz",
      title: t("Викторина", "Quiz"),
      subtitle: t("Найди букву и слово", "Find the letter and word"),
      icon: <Target className="w-10 h-10 text-cyan-500" />,
      bgColor: "bg-gradient-to-br from-cyan-100 to-sky-100",
      borderColor: "border-cyan-200",
    },
    {
      id: "vowels",
      title: t("Гласные и согласные", "Vowels and consonants"),
      subtitle: t("Учим A, E, I, O, U", "Learn A, E, I, O and U"),
      icon: <Circle className="w-10 h-10 text-indigo-500 fill-indigo-500" />,
      bgColor: "bg-gradient-to-br from-indigo-100 to-purple-100",
      borderColor: "border-indigo-200",
    },
    {
      id: "missing",
      title: t("Пропущенная буква", "Missing letter"),
      subtitle: t("Какая буква пропала?", "Which letter is missing?"),
      icon: <HelpCircle className="w-10 h-10 text-emerald-500" />,
      bgColor: "bg-gradient-to-br from-emerald-100 to-teal-100",
      borderColor: "border-emerald-200",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4 pb-20">
      <StreakBonusBanner />
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Шапка */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full bg-white shadow-sm"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-indigo-600">English</h1>
            <p className="text-sm text-muted-foreground">{t("Учим английский весело!", "Have fun learning English!")}</p>
          </div>
        </div>

        {learner && (
          <SchoolModeGuard><EnglishCourse key={learner} learner={learner} /></SchoolModeGuard>
        )}

        <h2 className="text-xl font-extrabold">{t("Карточки и игры", "Flashcards and games")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((mod) => (
            <Card
              key={mod.id}
              onClick={() => handleModuleClick(mod.id, mod.title)}
              className={`${mod.bgColor} border-2 ${mod.borderColor} p-6 text-center cursor-pointer hover:scale-[1.02] transition-all shadow-md flex flex-col items-center justify-center min-h-[160px]`}
            >
              <div className="mb-3 p-3 bg-white/80 rounded-2xl shadow-sm">
                {mod.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-800">{mod.title}</h3>
              <p className="text-xs text-slate-600 mt-1">{mod.subtitle}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
