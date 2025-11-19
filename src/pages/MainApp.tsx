import { UserWelcome } from "@/components/UserWelcome";
import { SubjectCard } from "@/components/SubjectCard";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
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

  const handleAIChat = () => {
    toast({
      title: "ИИ-учитель скоро появится! 🤖",
      description: "Мы работаем над созданием умного помощника для обучения",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <UserWelcome />

        <div className="mt-12 text-center space-y-4">
          <div className="inline-block animate-bounce-gentle">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              🦊 Умный Лисёнок
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Выбери предмет для изучения
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <SubjectCard
            emoji="🔢"
            title="Математика"
            onClick={() => navigate("/math")}
          />
          <SubjectCard
            emoji="📚"
            title="Алфавит"
            onClick={() => handleSubjectClick("Алфавит")}
          />
          <SubjectCard
            emoji="🌍"
            title="Окружающий мир"
            onClick={() => handleSubjectClick("Окружающий мир")}
          />
          <SubjectCard
            emoji="🎨"
            title="Творчество"
            onClick={() => handleSubjectClick("Творчество")}
          />
        </div>

        <div className="mt-12 text-center">
          <Button
            size="lg"
            onClick={handleAIChat}
            className="bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <MessageSquare className="mr-2 h-6 w-6" />
            Поговорить с ИИ-учителем
          </Button>
        </div>
      </div>
    </div>
  );
};
