import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trophy, Flame, Smartphone } from "lucide-react";

interface ChildCardProps {
  child: {
    child_id: string;
    first_name: string | null;
    avatar_url: string | null;
    stars: number;
    level: number;
    experience: number;
    daily_streak: number;
  };
  isSelected: boolean;
  onSelect: () => void;
  onStartSession: () => void;
}

export const ChildCard = ({ child, isSelected, onSelect, onStartSession }: ChildCardProps) => {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="text-5xl">
            {child.avatar_url || "👶"}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{child.first_name || "Ребёнок"}</h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-primary" />
                Ур. {child.level}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-accent fill-accent" />
                {child.stars}
              </span>
              <span className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" />
                {child.daily_streak}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onStartSession();
            }}
          >
            <Smartphone className="w-4 h-4 mr-1" />
            Играть здесь
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
