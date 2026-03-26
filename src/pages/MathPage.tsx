import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useNavigate } from "react-router-dom";
import { Level1Exercises } from "@/components/math/Level1Exercises";
import { Level2Exercises } from "@/components/math/Level2Exercises";
import { Level3Exercises } from "@/components/math/Level3Exercises";
import { Level4Exercises } from "@/components/math/Level4Exercises";

const levels = [
  {
    level: 1,
    age: "3-4 года",
    title: "Первые шаги",
    description: "Счет до 5, формы и цвета",
    emoji: "🐣",
    gradient: "from-yellow-400/20 to-orange-400/20",
    border: "border-yellow-400/30"
  },
  {
    level: 2,
    age: "4-5 лет",
    title: "Юный строитель",
    description: "Счет до 10, простые действия",
    emoji: "🏗️",
    gradient: "from-blue-400/20 to-cyan-400/20",
    border: "border-blue-400/30"
  },
  {
    level: 3,
    age: "5-6 лет",
    title: "Умный математик",
    description: "Счет до 20, задачи и измерения",
    emoji: "🧮",
    gradient: "from-green-400/20 to-emerald-400/20",
    border: "border-green-400/30"
  },
  {
    level: 4,
    age: "6-7 лет",
    title: "Мастер чисел",
    description: "Счет до 100, умножение, головоломки",
    emoji: "🎓",
    gradient: "from-purple-400/20 to-pink-400/20",
    border: "border-purple-400/30"
  }
];

export default function MathPage() {
  const navigate = useNavigate();
  const { logActivity } = useActivityTracker();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const renderLevelContent = () => {
    switch (selectedLevel) {
      case 1:
        return <Level1Exercises onBack={() => setSelectedLevel(null)} />;
      case 2:
        return <Level2Exercises onBack={() => setSelectedLevel(null)} />;
      case 3:
        return <Level3Exercises onBack={() => setSelectedLevel(null)} />;
      case 4:
        return <Level4Exercises onBack={() => setSelectedLevel(null)} />;
      default:
        return null;
    }
  };

  if (selectedLevel) {
    return renderLevelContent();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce-gentle">🔢</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            Математический мир
          </h1>
          <p className="text-lg text-muted-foreground">
            Выбери свой уровень и начни приключение!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {levels.map((level) => (
            <Card
              key={level.level}
              className={`p-6 cursor-pointer hover:shadow-xl transition-all bg-gradient-to-br ${level.gradient} border-2 ${level.border} group`}
              onClick={() => {
                logActivity("select_level", { section: "math", level: level.level });
                setSelectedLevel(level.level);
              }}
            >
              <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">
                {level.emoji}
              </div>
              <div className="text-sm text-muted-foreground mb-1">{level.age}</div>
              <h3 className="text-2xl font-bold mb-2">{level.title}</h3>
              <p className="text-muted-foreground">{level.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
