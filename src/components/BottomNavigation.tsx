import { Home, Mic, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAIChat = () => {
    toast({
      title: "ИИ-учитель скоро появится! 🤖",
      description: "Мы работаем над созданием умного помощника для обучения",
    });
  };

  return (
    <div className="fixed bottom-8 left-0 right-0 flex items-center justify-center gap-8 px-4">
      <Button
        size="icon"
        variant="outline"
        onClick={() => navigate("/")}
        className="w-12 h-12 rounded-xl bg-card shadow-lg border-2 border-primary/20 hover:border-primary/40"
      >
        <Home className="w-5 h-5 text-primary" />
      </Button>
      
      <Button
        size="icon"
        onClick={handleAIChat}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-2xl hover:shadow-primary/50 hover:scale-105 transition-all duration-300"
      >
        <Mic className="w-8 h-8 text-primary-foreground" />
      </Button>
      
      <Button
        size="icon"
        variant="outline"
        onClick={() => toast({ title: "Настройки", description: "Скоро появятся!" })}
        className="w-12 h-12 rounded-xl bg-card shadow-lg border-2 border-muted-foreground/20 hover:border-muted-foreground/40"
      >
        <Settings className="w-5 h-5 text-muted-foreground" />
      </Button>
    </div>
  );
};
