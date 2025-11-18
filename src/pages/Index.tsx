import { useVKAuth } from "@/contexts/VKAuthContext";
import { AuthScreen } from "@/components/AuthScreen";
import { MainApp } from "./MainApp";

const Index = () => {
  const { isAuthenticated, isLoading } = useVKAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5">
        <div className="text-center space-y-4">
          <div className="text-8xl animate-bounce-gentle">🦊</div>
          <p className="text-xl text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <MainApp />;
};

export default Index;
