import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useActivityTracker } from "@/hooks/useActivityTracker";

type ExerciseType = "count" | "shapes" | "sort" | "compare";

interface Level1ExercisesProps {
  onBack: () => void;
}

export const Level1Exercises = ({ onBack }: Level1ExercisesProps) => {
  const { toast } = useToast();
  const { addStars } = useUserProgress();
  const { logCorrectAnswer, logWrongAnswer, logActivity } = useActivityTracker();
  const [currentExercise, setCurrentExercise] = useState<ExerciseType | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  // Счет до 5 - кормление животных
  const [feedingAnimals, setFeedingAnimals] = useState<number>(Math.floor(Math.random() * 5) + 1);
  const [selectedCount, setSelectedCount] = useState<number | null>(null);

  // Геометрические фигуры
  const shapes = ["circle", "square", "triangle", "star"];
  const [currentShape, setCurrentShape] = useState(shapes[Math.floor(Math.random() * shapes.length)]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.8;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const checkFeedingAnswer = (count: number) => {
    const correct = count === feedingAnimals;
    setSelectedCount(count);
    setTotal(total + 1);

    if (correct) {
      setScore(score + 1);
      addStars(1);
      logCorrectAnswer({ section: "math", level: 1, exercise: "counting", answer: count });
      speak("Правильно! Молодец!");
      toast({
        title: "Отлично! 🎉",
        description: "Ты правильно покормил животных! +1 ⭐",
      });
    } else {
      logWrongAnswer({ section: "math", level: 1, exercise: "counting", answer: count, correct: feedingAnimals });
      speak("Попробуй ещё раз посчитать!");
      toast({
        title: "Попробуй ещё! 💪",
        description: `Правильный ответ: ${feedingAnimals}`,
        variant: "destructive",
      });
    }

    setTimeout(() => {
      setSelectedCount(null);
      setFeedingAnimals(Math.floor(Math.random() * 5) + 1);
    }, 1500);
  };

  const renderAnimalEmojis = () => {
    const animals = ["🐰", "🐶", "🐱", "🐼", "🐨"];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    return Array(feedingAnimals).fill(animal);
  };

  const renderShapeEmoji = (shape: string) => {
    const emojiMap: Record<string, string> = {
      circle: "🔵",
      square: "🟦",
      triangle: "🔺",
      star: "⭐"
    };
    return emojiMap[shape] || "⭐";
  };

  const exercises = [
    {
      type: "count" as ExerciseType,
      title: "Кормление животных",
      description: "Посчитай и покорми всех!",
      emoji: "🍎"
    },
    {
      type: "shapes" as ExerciseType,
      title: "Найди пару",
      description: "Найди одинаковые фигуры",
      emoji: "🔷"
    },
    {
      type: "sort" as ExerciseType,
      title: "Сортировка",
      description: "Разложи по размеру",
      emoji: "📦"
    },
    {
      type: "compare" as ExerciseType,
      title: "Больше-меньше",
      description: "Сравни фрукты",
      emoji: "🍊"
    }
  ];

  if (!currentExercise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-background p-4">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" onClick={onBack} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Выбрать уровень
          </Button>

          <div className="text-center mb-8">
            <div className="text-6xl mb-4 animate-bounce-gentle">🐣</div>
            <h1 className="text-4xl font-bold mb-2">Первые шаги</h1>
            <p className="text-lg text-muted-foreground">3-4 года</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exercises.map((ex) => (
              <Card
                key={ex.type}
                className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-yellow-400/30 bg-gradient-to-br from-yellow-400/10 to-orange-400/10"
                onClick={() => setCurrentExercise(ex.type)}
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
  }

  if (currentExercise === "count") {
    const animals = renderAnimalEmojis();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-background p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" onClick={() => setCurrentExercise(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
            <div className="text-lg font-semibold">
              Счёт: {score} / {total}
            </div>
          </div>

          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Посчитай животных и покорми их! 🍎</h2>
            
            <div className="flex justify-center gap-3 mb-8 text-6xl flex-wrap">
              {animals.map((animal, idx) => (
                <span key={idx} className="animate-bounce-gentle" style={{ animationDelay: `${idx * 100}ms` }}>
                  {animal}
                </span>
              ))}
            </div>

            <p className="text-xl mb-6">Сколько яблок нужно?</p>

            <div className="grid grid-cols-5 gap-3 max-w-md mx-auto">
              {[1, 2, 3, 4, 5].map((num) => (
                <Button
                  key={num}
                  size="lg"
                  onClick={() => checkFeedingAnswer(num)}
                  disabled={selectedCount !== null}
                  className={`text-2xl h-16 ${
                    selectedCount === num && num === feedingAnimals
                      ? "bg-green-500 hover:bg-green-600"
                      : selectedCount === num
                      ? "bg-red-500 hover:bg-red-600"
                      : ""
                  }`}
                >
                  {num}
                  {selectedCount === num && num === feedingAnimals && <Check className="ml-1" />}
                  {selectedCount === num && num !== feedingAnimals && <X className="ml-1" />}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (currentExercise === "shapes") {
    const allShapes = [...shapes, ...shapes].sort(() => Math.random() - 0.5);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-background p-4">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" onClick={() => setCurrentExercise(null)} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>

          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-6">Найди пару для фигуры</h2>
            
            <div className="text-8xl mb-8">
              {renderShapeEmoji(currentShape)}
            </div>

            <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
              {allShapes.map((shape, idx) => (
                <Button
                  key={idx}
                  size="lg"
                  className="text-6xl h-24"
                  onClick={() => {
                    if (shape === currentShape) {
                      addStars(1);
                      logCorrectAnswer({ section: "math", level: 1, exercise: "shapes", shape });
                      toast({ title: "Правильно! 🎉 +1 ⭐" });
                      speak("Правильно! Молодец!");
                      setScore(score + 1);
                    } else {
                      logWrongAnswer({ section: "math", level: 1, exercise: "shapes", shape, correct: currentShape });
                      toast({ title: "Попробуй ещё! 💪", variant: "destructive" });
                      speak("Попробуй ещё раз!");
                    }
                    setTotal(total + 1);
                    setTimeout(() => {
                      setCurrentShape(shapes[Math.floor(Math.random() * shapes.length)]);
                    }, 1000);
                  }}
                >
                  {renderShapeEmoji(shape)}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-background p-4">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => setCurrentExercise(null)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Скоро появится!</h2>
          <p className="text-muted-foreground">Это упражнение находится в разработке</p>
        </Card>
      </div>
    </div>
  );
};
