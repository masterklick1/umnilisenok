import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useActivityTracker } from "@/hooks/useActivityTracker";

type ExerciseType = "abacus" | "building" | "3dshapes" | "patterns";

interface Level2ExercisesProps {
  onBack: () => void;
}

export const Level2Exercises = ({ onBack }: Level2ExercisesProps) => {
  const { toast } = useToast();
  const { addStars } = useUserProgress();
  const { logCorrectAnswer, logWrongAnswer } = useActivityTracker();
  const [currentExercise, setCurrentExercise] = useState<ExerciseType | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  // Счет на абаке до 10
  const [abacusNumber, setAbacusNumber] = useState(Math.floor(Math.random() * 10) + 1);
  
  // Строительство домиков (сложение/вычитание)
  const [buildingProblem, setBuildingProblem] = useState(generateBuildingProblem());

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.8;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  function generateBuildingProblem() {
    const num1 = Math.floor(Math.random() * 5) + 1;
    const num2 = Math.floor(Math.random() * 5) + 1;
    const isAddition = Math.random() > 0.5;
    
    if (isAddition) {
      return {
        question: `${num1} + ${num2}`,
        answer: num1 + num2,
        emoji: "🏠"
      };
    } else {
      const larger = Math.max(num1, num2);
      const smaller = Math.min(num1, num2);
      return {
        question: `${larger} - ${smaller}`,
        answer: larger - smaller,
        emoji: "🏠"
      };
    }
  }

  const checkAnswer = (selected: number, correct: number) => {
    const isCorrect = selected === correct;
    setTotal(total + 1);

    if (isCorrect) {
      setScore(score + 1);
      addStars(1);
      logCorrectAnswer({ section: "math", level: 2, answer: selected });
      speak("Правильно! Отлично!");
      toast({
        title: "Правильно! 🎉",
        description: "Ты молодец! +1 ⭐",
      });
    } else {
      logWrongAnswer({ section: "math", level: 2, answer: selected, correct });
      speak("Не правильно. Попробуй ещё раз!");
      toast({
        title: "Попробуй ещё раз! 💪",
        description: `Правильный ответ: ${correct}`,
        variant: "destructive",
      });
    }
  };

  const exercises = [
    {
      type: "abacus" as ExerciseType,
      title: "Счёты-абак",
      description: "Считаем до 10 вместе",
      emoji: "🧮"
    },
    {
      type: "building" as ExerciseType,
      title: "Строим домики",
      description: "Сложение и вычитание",
      emoji: "🏗️"
    },
    {
      type: "3dshapes" as ExerciseType,
      title: "Объёмные фигуры",
      description: "Куб, шар, пирамида",
      emoji: "🎲"
    },
    {
      type: "patterns" as ExerciseType,
      title: "Узоры",
      description: "Найди закономерность",
      emoji: "🔢"
    }
  ];

  if (!currentExercise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-background p-4">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" onClick={onBack} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Выбрать уровень
          </Button>

          <div className="text-center mb-8">
            <div className="text-6xl mb-4 animate-bounce-gentle">🏗️</div>
            <h1 className="text-4xl font-bold mb-2">Юный строитель</h1>
            <p className="text-lg text-muted-foreground">4-5 лет</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exercises.map((ex) => (
              <Card
                key={ex.type}
                className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-blue-400/30 bg-gradient-to-br from-blue-400/10 to-cyan-400/10"
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

  if (currentExercise === "abacus") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-background p-4">
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
            <h2 className="text-2xl font-bold mb-6">Посчитай бусинки на счётах!</h2>
            
            <div className="mb-8">
              {[...Array(10)].map((_, idx) => (
                <div key={idx} className="flex justify-center items-center gap-2 mb-2">
                  <span className="text-xl w-8">{idx + 1}</span>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, beadIdx) => (
                      <div
                        key={beadIdx}
                        className={`w-8 h-8 rounded-full ${
                          beadIdx < abacusNumber && idx === 0
                            ? "bg-primary"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xl mb-6">Сколько бусинок?</p>

            <div className="grid grid-cols-5 gap-3 max-w-2xl mx-auto">
              {[...Array(10)].map((_, idx) => (
                <Button
                  key={idx}
                  size="lg"
                  onClick={() => {
                    checkAnswer(idx + 1, abacusNumber);
                    setTimeout(() => {
                      setAbacusNumber(Math.floor(Math.random() * 10) + 1);
                    }, 1500);
                  }}
                  className="text-2xl h-16"
                >
                  {idx + 1}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (currentExercise === "building") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-background p-4">
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
            <h2 className="text-2xl font-bold mb-6">Строим домики!</h2>
            
            <div className="text-6xl mb-8">
              {buildingProblem.question.split('').map((char, idx) => (
                <span key={idx} className="mx-1">
                  {char === '+' || char === '-' ? char : char}
                </span>
              ))}
              {" = ?"}
            </div>

            <div className="flex justify-center gap-4 mb-8">
              {buildingProblem.question.includes('+') ? (
                <>
                  <div className="text-4xl">
                    {[...Array(parseInt(buildingProblem.question.split('+')[0]))].map((_, i) => (
                      <span key={i}>🏠</span>
                    ))}
                  </div>
                  <span className="text-4xl">+</span>
                  <div className="text-4xl">
                    {[...Array(parseInt(buildingProblem.question.split('+')[1]))].map((_, i) => (
                      <span key={i}>🏠</span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-4xl">
                  {[...Array(buildingProblem.answer)].map((_, i) => (
                    <span key={i}>🏠</span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-3 max-w-md mx-auto">
              {[...Array(10)].map((_, idx) => (
                <Button
                  key={idx}
                  size="lg"
                  onClick={() => {
                    checkAnswer(idx + 1, buildingProblem.answer);
                    setTimeout(() => {
                      setBuildingProblem(generateBuildingProblem());
                    }, 1500);
                  }}
                  className="text-2xl h-16"
                >
                  {idx + 1}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-background p-4">
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
