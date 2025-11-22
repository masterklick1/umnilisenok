import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ExerciseType = "count100" | "multiplication" | "puzzles" | "spatial";

interface Level4ExercisesProps {
  onBack: () => void;
}

export const Level4Exercises = ({ onBack }: Level4ExercisesProps) => {
  const { toast } = useToast();
  const [currentExercise, setCurrentExercise] = useState<ExerciseType | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  const exercises = [
    {
      type: "count100" as ExerciseType,
      title: "Счёт до 100",
      description: "Чётные и нечётные числа",
      emoji: "💯"
    },
    {
      type: "multiplication" as ExerciseType,
      title: "Умножение",
      description: "Многократное сложение",
      emoji: "✖️"
    },
    {
      type: "puzzles" as ExerciseType,
      title: "Головоломки",
      description: "Логические задачи",
      emoji: "🧩"
    },
    {
      type: "spatial" as ExerciseType,
      title: "Пространство",
      description: "Проекции и развёртки",
      emoji: "🎲"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-background p-4">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Выбрать уровень
        </Button>

        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce-gentle">🎓</div>
          <h1 className="text-4xl font-bold mb-2">Мастер чисел</h1>
          <p className="text-lg text-muted-foreground">6-7 лет</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exercises.map((ex) => (
            <Card
              key={ex.type}
              className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-purple-400/30 bg-gradient-to-br from-purple-400/10 to-pink-400/10"
              onClick={() => {
                toast({
                  title: "Скоро появится! 🚧",
                  description: "Это упражнение находится в разработке"
                });
              }}
            >
              <div className="text-5xl mb-3">{ex.emoji}</div>
              <h3 className="text-xl font-bold mb-1">{ex.title}</h3>
              <p className="text-sm text-muted-foreground">{ex.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
