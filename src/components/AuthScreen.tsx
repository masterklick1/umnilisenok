import { useVKAuth } from "@/contexts/VKAuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const AuthScreen = () => {
  const { login } = useVKAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl">
        <div className="animate-float">
          <div className="text-8xl mb-4">🦊</div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Умный Лисёнок
        </h1>
        <p className="text-lg text-muted-foreground">
          Добро пожаловать в мир увлекательного обучения!
        </p>
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Войдите через VK, чтобы начать обучение
          </p>
          <Button
            onClick={login}
            size="lg"
            className="w-full bg-[#4A76A8] hover:bg-[#3d6490] text-white font-semibold py-6 text-lg"
          >
            <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.79 14.99h-1.63c-.67 0-.87-.54-2.07-1.76-1.03-1.02-1.49-1.16-1.75-1.16-.36 0-.46.1-.46.58v1.61c0 .43-.14.69-1.27.69-1.87 0-3.94-.82-5.39-2.82-2.17-2.91-2.76-5.1-2.76-5.55 0-.26.1-.5.58-.5h1.63c.43 0 .59.2.76.66.83 2.43 2.22 4.56 2.8 4.56.21 0 .31-.1.31-.65v-2.53c-.07-1.19-.7-1.29-.7-1.72 0-.21.17-.42.45-.42h2.56c.36 0 .49.2.49.63v3.42c0 .36.16.49.26.49.21 0 .39-.13.78-.52 1.21-1.36 2.08-3.46 2.08-3.46.11-.24.32-.47.75-.47h1.63c.49 0 .59.25.49.59-.19.82-2.28 3.75-2.28 3.75-.17.28-.24.41 0 .72.18.24.77.75 1.16 1.2.71.82 1.26 1.5 1.41 1.98.14.47-.08.71-.56.71z"/>
            </svg>
            Войти через VKontakte
          </Button>
        </div>
      </Card>
    </div>
  );
};
