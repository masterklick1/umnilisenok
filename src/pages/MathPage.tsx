import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type Exercise = {
  question: string;
  answer: number;
  options: number[];
};

const generateExercise = (level: number): Exercise => {
  const mathRandom = Math.random;
  const mathFloor = Math.floor;
  let num1: number, num2: number, answer: number;
  
  if (level === 1) {
    // Простое сложение (1-5)
    num1 = mathFloor(mathRandom() * 5) + 1;
    num2 = mathFloor(mathRandom() * 5) + 1;
    answer = num1 + num2;
    return {
      question: `${num1} + ${num2} = ?`,
      answer,
      options: generateOptions(answer, 10)
    };
  } else {
    // Вычитание (1-10)
    num1 = mathFloor(mathRandom() * 10) + 1;
    num2 = mathFloor(mathRandom() * num1) + 1;
    answer = num1 - num2;
    return {
      question: `${num1} - ${num2} = ?`,
      answer,
      options: generateOptions(answer, 10)
    };
  }
};

const generateOptions = (correct: number, max: number): number[] => {
  const mathRandom = Math.random;
  const mathFloor = Math.floor;
  const options = new Set([correct]);
  while (options.size < 4) {
    const opt = mathFloor(mathRandom() * max);
    if (opt >= 0) options.add(opt);
  }
  return Array.from(options).sort(() => mathRandom() - 0.5);
};

export default function MathPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [level, setLevel] = useState<number | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [showResult, setShowResult] = useState<boolean | null>(null);

  const startLevel = (lvl: number) => {
    setLevel(lvl);
    setExercise(generateExercise(lvl));
    setScore(0);
    setTotal(0);
    setShowResult(null);
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.8;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const checkAnswer = (selected: number) => {
    if (!exercise) return;
    
    const correct = selected === exercise.answer;
    setShowResult(correct);
    setTotal(total + 1);
    
    if (correct) {
      setScore(score + 1);
      speak("Правильно! Молодец!");
      toast({
        title: "Правильно! 🎉",
        description: "Отличная работа!",
      });
    } else {
      speak("Не правильно. Ещё раз подумай!");
      toast({
        title: "Попробуй ещё раз! 💪",
        description: `Правильный ответ: ${exercise.answer}`,
        variant: "destructive",
      });
    }

    setTimeout(() => {
      setShowResult(null);
      if (level) setExercise(generateExercise(level));
    }, 1500);
  };

  const resetGame = () => {
    setLevel(null);
    setExercise(null);
    setScore(0);
    setTotal(0);
    setShowResult(null);
  };

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
            Математика
          </h1>
          <p className="text-lg text-muted-foreground">
            Учимся считать весело!
          </p>
        </div>

        {!level && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card 
              className="p-8 text-center hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20"
              onClick={() => startLevel(1)}
            >
              <div className="text-5xl mb-4">➕</div>
              <h3 className="text-2xl font-bold mb-2">Сложение</h3>
              <p className="text-muted-foreground">Учимся складывать числа от 1 до 5</p>
            </Card>

            <Card 
              className="p-8 text-center hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-secondary/10 to-secondary/5 border-2 border-secondary/20"
              onClick={() => startLevel(2)}
            >
              <div className="text-5xl mb-4">➖</div>
              <h3 className="text-2xl font-bold mb-2">Вычитание</h3>
              <p className="text-muted-foreground">Учимся вычитать числа от 1 до 10</p>
            </Card>
          </div>
        )}

        {level && exercise && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg shadow">
              <div className="text-lg font-semibold">
                Счёт: {score} / {total}
              </div>
              <Button variant="outline" onClick={resetGame}>
                Выбрать уровень
              </Button>
            </div>

            <Card className="p-8 text-center">
              <div className="text-6xl font-bold mb-8 text-foreground">
                {exercise.question}
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {exercise.options.map((opt) => (
                  <Button
                    key={opt}
                    size="lg"
                    onClick={() => checkAnswer(opt)}
                    disabled={showResult !== null}
                    className={`text-3xl h-20 transition-all ${
                      showResult !== null && opt === exercise.answer
                        ? "bg-green-500 hover:bg-green-600"
                        : showResult === false && opt === exercise.answer
                        ? "bg-green-500"
                        : ""
                    }`}
                  >
                    {opt}
                    {showResult !== null && opt === exercise.answer && (
                      <Check className="ml-2 h-6 w-6" />
                    )}
                  </Button>
                ))}
              </div>
            </Card>

            {showResult !== null && (
              <div className={`text-center p-6 rounded-lg animate-scale-in ${
                showResult ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"
              }`}>
                <div className="text-6xl mb-2">
                  {showResult ? "🎉" : "💪"}
                </div>
                <div className="text-2xl font-bold">
                  {showResult ? "Правильно!" : "Попробуй ещё!"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
