import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
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
        "group relative overflow-hidden cursor-pointer rounded-3xl",
        "card-glow shine-on-hover animate-pop-in",
        "transition-all duration-300 hover:scale-[1.03] active:scale-[0.99]",
        "border-0 p-5 flex items-center gap-4 shadow-md",
        bgColor,
        className
      )}
    >
      {/* soft gradient sheen */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/5" />

      <div className="relative z-10 flex items-center gap-4 flex-1">
        <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ring-2 ring-white/60 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
          {icon}
        </div>
        
        <div className="flex flex-col">
          <h3 className="text-xl font-extrabold leading-tight tracking-tight">{title}</h3>
          <p className="text-sm opacity-80 mt-1 font-medium">{subtitle}</p>
        </div>
      </div>

      <div className="relative z-10 w-9 h-9 rounded-full bg-card/70 flex items-center justify-center shadow-sm transition-all duration-300 group-hover:translate-x-1 group-hover:bg-card">
        <ChevronRight className="w-5 h-5 text-foreground/70" />
      </div>
      
      {decorativeElements && (
        <div className="absolute right-10 top-0 bottom-0 opacity-10 text-7xl font-black flex items-center transition-transform duration-500 group-hover:scale-125 group-hover:opacity-20">
          {decorativeElements}
        </div>
      )}
    </Card>
  );
};
