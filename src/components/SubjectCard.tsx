import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface SubjectCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  className?: string;
  bgColor?: string;
  decorativeElements?: ReactNode;
}

export const SubjectCard = ({ 
  icon, 
  title, 
  subtitle, 
  onClick, 
  className,
  bgColor = "bg-primary/10",
  decorativeElements
}: SubjectCardProps) => {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
        "border-0 p-5 flex items-center gap-4",
        bgColor,
        className
      )}
    >
      <div className="relative z-10 flex items-center gap-4 flex-1">
        <div className="w-14 h-14 bg-card rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
          {icon}
        </div>
        
        <div className="flex flex-col">
          <h3 className="text-xl font-bold leading-tight">{title}</h3>
          <p className="text-sm opacity-80 mt-1">{subtitle}</p>
        </div>
      </div>
      
      {decorativeElements && (
        <div className="absolute right-0 top-0 bottom-0 opacity-10 text-6xl font-bold flex items-center pr-4">
          {decorativeElements}
        </div>
      )}
    </Card>
  );
};
