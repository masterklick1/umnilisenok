import { UserWelcome } from "@/components/UserWelcome";
import { SubjectCard } from "@/components/SubjectCard";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { UserAvatar } from "@/components/UserAvatar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Calculator, BookOpen, Leaf, Palette, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const MainApp = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubjectClick = (subject: string) => {
    toast({
      title: "Раздел в разработке 🚧",
      description: `Скоро здесь появятся уроки по теме "${subject}"`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 pb-32">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header with Score and Avatar */}
        <div className="flex items-center justify-between mb-6">
          <ScoreDisplay score={125} />
          <UserAvatar fallback="👤" />
        </div>

        {/* Welcome Message */}
        <UserWelcome />

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
            onClick={() => handleSubjectClick("Творчество")}
            bgColor="bg-purple-100"
            decorativeElements="🎨"
          />
          
          <SubjectCard
            icon={<Brain className="w-7 h-7 text-orange-600" />}
            title="Интеллект"
            subtitle="Пазлы и логика"
            onClick={() => handleSubjectClick("Интеллект")}
            bgColor="bg-yellow-100"
            decorativeElements="🧩"
          />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};
