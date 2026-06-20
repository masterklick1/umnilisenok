import { Star } from "lucide-react";

interface ScoreDisplayProps {
  score: number;
}

export const ScoreDisplay = ({ score }: ScoreDisplayProps) => {
  return (
    <div className="flex items-center gap-2 rounded-full px-4 py-2 shadow-md bg-gradient-to-r from-accent/20 to-amber-200/40 ring-1 ring-accent/30">
      <Star className="w-6 h-6 text-accent fill-accent drop-shadow-sm animate-pulse-soft" />
      <span className="text-xl font-extrabold text-accent">{score}</span>
    </div>
  );
};
