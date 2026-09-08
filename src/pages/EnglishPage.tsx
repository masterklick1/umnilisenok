import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Sparkles, Target, Circle, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EnglishPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleModuleClick = (title: string) => {
    toast({
      title: `${title} 🚀`,
      description: "Урок скоро станет доступен!",
    });
  };

  const modules = [
    {
      id: "abc",
      title: "ABC / Алфавит",
      subtitle: "Все буквы от A до Z",
      icon: <BookOpen className="w-10 h-10 text-rose-500" />,
      bgColor: "bg-gradient-to-br from-rose-100 to-orange-100",
      borderColor: "border-rose-200",
    },
    {
      id: "words",
      title: "Первые слова",
      subtitle: "Цвета, животные, цифры",
      icon: <Sparkles className="w-10 h-10 text-amber-500" />,
      bgColor: "bg-gradient-to-br from-amber-100 to-yellow-100",
      borderColor: "border-amber-200",
    },
    {
      id: "quiz",
      title: "Викторина",
      subtitle: "Найди букву и слово",
      icon: <Target className="w-10 h-10 text-cyan-500" />,
      bgColor: "bg-gradient-to-br from-cyan-100 to-sky-100",
      borderColor: "border-cyan-200",
    },
    {
      id: "vowels",
      title: "Гласные и согласные",
      subtitle: "Учим A, E, I, O, U",
      icon: <Circle className="w-10 h-10 text-indigo-500 fill-indigo-500" />,
      bgColor: "bg-gradient-to-br from-indigo-100 to-purple-100",
      borderColor: "border-indigo-200",
    },
    {
      id: "missing",
      title: "Пропущенная буква",
      subtitle: "Какая буква пропала?",
      icon: <HelpCircle className="w-10 h-10 text-emerald-500" />,
      bgColor: "bg-gradient-to-br from-emerald-100 to-teal-100",
      borderColor: "border-emerald-200",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Шапка */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full bg-white shadow-sm"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-indigo-600">English</h1>
            <p className="text-sm text-muted-foreground">Учим английский весело!</p>
          </div>
        </div>

        {/* Сетка модулей */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((mod) => (
            <Card
              key={mod.id}
              onClick={() => handleModuleClick(mod.title)}
              className={`${mod.bgColor} border-2 ${mod.borderColor} p-6 text-center cursor-pointer hover:scale-[1.02] transition-all shadow-md flex flex-col items-center justify-center min-h-[160px]`}
            >
              <div className="mb-3 p-3 bg-white/80 rounded-2xl shadow-sm">
                {mod.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-800">{mod.title}</h3>
              <p className="text-xs text-slate-600 mt-1">{mod.subtitle}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
