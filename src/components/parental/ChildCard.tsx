import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Trophy, Flame, Smartphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface ChildCardProps {
  child: {
    child_id: string;
    first_name: string | null;
    avatar_url: string | null;
    stars: number;
    level: number;
    experience: number;
    daily_streak: number;
    last_activity_at?: string | null;
    connected_via_invite?: boolean;
  };
  isSelected: boolean;
  onSelect: () => void;
  onStartSession: () => void;
}

export const ChildCard = ({ child, isSelected, onSelect, onStartSession }: ChildCardProps) => {
  const isRecentlyActive =
    child.last_activity_at &&
    Date.now() - new Date(child.last_activity_at).getTime() < 5 * 60 * 1000;

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
      } ${isRecentlyActive && !isSelected ? "ring-1 ring-green-400" : ""}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="text-5xl">{child.avatar_url || "👶"}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg">{child.first_name || "Ребёнок"}</h3>
              {child.connected_via_invite ? (
                <Badge variant="secondary" className="text-xs">
                  📱 Свой телефон
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  💻 Это устройство
                </Badge>
              )}
              {isRecentlyActive && (
                <Badge className="text-xs bg-green-500 hover:bg-green-500">Сейчас играет</Badge>
              )}
            </div>
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
            {child.last_activity_at ? (
              <p className="text-xs text-muted-foreground mt-1">
                Активность:{" "}
                {formatDistanceToNow(new Date(child.last_activity_at), {
                  addSuffix: true,
                  locale: ru,
                })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Ещё не играл(а)</p>
            )}
          </div>
        </div>

        {!child.connected_via_invite && (
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
        )}
      </CardContent>
    </Card>
  );
};
