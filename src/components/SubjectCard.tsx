import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SubjectCardProps {
  emoji: string;
  title: string;
  onClick: () => void;
  className?: string;
}

export const SubjectCard = ({ emoji, title, onClick, className }: SubjectCardProps) => {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-8 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg",
        "bg-card border-2 border-primary/20 hover:border-primary/40",
        "flex flex-col items-center justify-center gap-4 text-center",
        className
      )}
    >
      <div className="text-6xl animate-bounce-gentle">{emoji}</div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
    </Card>
  );
};
