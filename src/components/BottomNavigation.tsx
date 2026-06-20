import { Home, Mic, Settings, House, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isDemo } = useAuth();
  const { isParent } = useUserRole();

  const handleAIChat = () => {
    toast({
      title: "ИИ-учитель скоро появится! 🤖",
      description: "Мы работаем над созданием умного помощника для обучения",
    });
  };

  const handleVirtualHome = () => {
    if (isDemo) {
      toast({
        title: "Комната после аккаунта 🏠",
        description: "Демо — только уроки. Комната сохраняется в аккаунте ребёнка.",
      });
      return;
    }

    navigate("/home");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-8 left-0 right-0 flex items-center justify-center gap-4 px-4">
      <Button
        size="icon"
        variant="outline"
        onClick={() => navigate("/")}
        className={`w-12 h-12 rounded-xl bg-card shadow-lg border-2 transition-all ${
          isActive("/") 
            ? "border-primary bg-primary/10" 
            : "border-primary/20 hover:border-primary/40"
        }`}
      >
        <Home className="w-5 h-5 text-primary" />
      </Button>

      <Button
        size="icon"
        variant="outline"
        onClick={handleVirtualHome}
        className={`w-12 h-12 rounded-xl bg-card shadow-lg border-2 transition-all ${
          isActive("/home") 
            ? "border-secondary bg-secondary/10" 
            : "border-secondary/20 hover:border-secondary/40"
        }`}
      >
        <House className="w-5 h-5 text-secondary" />
      </Button>
      
      <Button
        size="icon"
        onClick={handleAIChat}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-2xl hover:shadow-primary/50 hover:scale-105 transition-all duration-300"
      >
        <Mic className="w-7 h-7 text-primary-foreground" />
      </Button>
      
      {isParent && (
        <Button
          size="icon"
          variant="outline"
          onClick={() => navigate("/parent")}
          className={`w-12 h-12 rounded-xl bg-card shadow-lg border-2 transition-all ${
            isActive("/parent") 
              ? "border-accent bg-accent/10" 
              : "border-accent/20 hover:border-accent/40"
          }`}
        >
          <Users className="w-5 h-5 text-accent" />
        </Button>
      )}

      <Button
        size="icon"
        variant="outline"
        onClick={() => navigate("/settings")}
        className={`w-12 h-12 rounded-xl bg-card shadow-lg border-2 transition-all ${
          isActive("/settings")
            ? "border-muted-foreground bg-muted"
            : "border-muted-foreground/20 hover:border-muted-foreground/40"
        }`}
      >
        <Settings className="w-5 h-5 text-muted-foreground" />
      </Button>
    </div>
  );
};
