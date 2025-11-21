import { Star } from "lucide-react";

interface ScoreDisplayProps {
  score: number;
}

export const ScoreDisplay = ({ score }: ScoreDisplayProps) => {
  return (
    <div className="flex items-center gap-2 bg-card rounded-full px-4 py-2 shadow-md">
      <Star className="w-6 h-6 text-accent fill-accent" />
      <span className="text-xl font-bold text-accent">{score}</span>
    </div>
  );
};
