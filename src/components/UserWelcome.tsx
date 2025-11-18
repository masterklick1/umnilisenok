import { useVKAuth } from "@/contexts/VKAuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const UserWelcome = () => {
  const { user, logout } = useVKAuth();

  if (!user) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl shadow-md border border-primary/20">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border-4 border-primary">
          <AvatarImage src={user.photo_100} alt={user.first_name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
            {user.first_name[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-bold text-lg text-foreground">
            Привет, {user.first_name}! 🦊
          </div>
          <div className="text-sm text-muted-foreground">
            Готов учиться с Умным Лисёнком?
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={logout}
        className="hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
};
