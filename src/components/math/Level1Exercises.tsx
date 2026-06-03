import { useState, useMemo } from "react";
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

const speak = (text: string) => {
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ru-RU";
    u.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
};

export const Level1Exercises = ({ onBack }: Level1ExercisesProps) => {
  const { toast } = useToast();
  const { addStars } = useUserProgress();
  const { logCorrectAnswer, logWrongAnswer } = useActivityTracker();
  const [currentExercise, setCurrentExercise] = useState<ExerciseType | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  // Кормление
  const [feedingAnimals, setFeedingAnimals] = useState<number>(Math.floor(Math.random() * 5) + 1);
  const [selectedCount, setSelectedCount] = useState<number | null>(null);

  // Фигуры
  const shapes = ["circle", "square", "triangle", "star"];
  const [currentShape, setCurrentShape] = useState(shapes[Math.floor(Math.random() * shapes.length)]);

  // Сортировка
  const [sortRound, setSortRound] = useState(0);
  const [sortClicked, setSortClicked] = useState<number[]>([]);

  // Сравнение
  const [compareRound, setCompareRound] = useState(0);

  const reward = (msg: string) => {
    addStars(1);
    setScore((s) => s + 1);
    speak("Правильно! Молодец!");
    toast({ title: msg + " 🎉", description: "+1 ⭐" });
  };

  const wrong = (correct: string) => {
    speak("Попробуй ещё раз!");
    toast({ title: "Попробуй ещё! 💪", description: `Правильно: ${correct}`, variant: "destructive" });
  };

  const exercises = [
    { type: "count" as ExerciseType, title: "Кормление животных", description: "Посчитай и покорми всех!", emoji: "🍎" },
    { type: "shapes" as ExerciseType, title: "Найди пару", description: "Найди одинаковые фигуры", emoji: "🔷" },
    { type: "sort" as ExerciseType, title: "Сортировка", description: "От маленького к большому", emoji: "📦" },
    { type: "compare" as ExerciseType, title: "Больше-меньше", description: "Где больше фруктов?", emoji: "🍊" },
  ];

  // ===== Меню =====
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
            <h1 className="text-4xl font-bold mb-2">Малыш-математик</h1>
            <p className="text-lg text-muted-foreground">3-4 года</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exercises.map((ex) => (
              <Card
                key={ex.type}
                className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-yellow-400/30 bg-gradient-to-br from-yellow-100/50 to-orange-100/50"
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

  // ===== Кормление =====
  if (currentExercise === "count") {
    const animal = ["🐰", "🐶", "🐱", "🐼", "🐨"][feedingAnimals % 5];
    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-2xl font-bold mb-4">Посчитай животных и покорми их! 🍎</h2>
        <div className="flex justify-center gap-3 mb-8 text-6xl flex-wrap">
          {Array(feedingAnimals).fill(animal).map((a, i) => (
            <span key={i} className="animate-bounce-gentle" style={{ animationDelay: `${i * 100}ms` }}>{a}</span>
          ))}
        </div>
        <p className="text-xl mb-6">Сколько яблок нужно?</p>
        <div className="grid grid-cols-5 gap-3 max-w-md mx-auto">
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              size="lg"
              disabled={selectedCount !== null}
              onClick={() => {
                setSelectedCount(n);
                setTotal((t) => t + 1);
                if (n === feedingAnimals) {
                  reward("Отлично");
                  logCorrectAnswer({ section: "math", level: 1, exercise: "counting", answer: n });
                } else {
                  wrong(String(feedingAnimals));
                  logWrongAnswer({ section: "math", level: 1, exercise: "counting", answer: n, correct: feedingAnimals });
                }
                setTimeout(() => {
                  setSelectedCount(null);
                  setFeedingAnimals(Math.floor(Math.random() * 5) + 1);
                }, 1500);
              }}
              className={`text-2xl h-16 ${selectedCount === n && n === feedingAnimals ? "bg-green-500" : selectedCount === n ? "bg-red-500" : ""}`}
            >
              {n}
              {selectedCount === n && n === feedingAnimals && <Check className="ml-1" />}
              {selectedCount === n && n !== feedingAnimals && <X className="ml-1" />}
            </Button>
          ))}
        </div>
      </Wrapper>
    );
  }

  // ===== Фигуры =====
  if (currentExercise === "shapes") {
    const emojiMap: Record<string, string> = { circle: "🔵", square: "🟦", triangle: "🔺", star: "⭐" };
    const allShapes = [...shapes, ...shapes].sort(() => Math.random() - 0.5);
    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-2xl font-bold mb-6">Найди такую же фигуру</h2>
        <div className="text-8xl mb-8">{emojiMap[currentShape]}</div>
        <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
          {allShapes.map((s, i) => (
            <Button
              key={i}
              size="lg"
              className="text-6xl h-24"
              onClick={() => {
                setTotal((t) => t + 1);
                if (s === currentShape) {
                  reward("Правильно");
                  logCorrectAnswer({ section: "math", level: 1, exercise: "shapes", shape: s });
                } else {
                  wrong(emojiMap[currentShape]);
                  logWrongAnswer({ section: "math", level: 1, exercise: "shapes", shape: s, correct: currentShape });
                }
                setTimeout(() => setCurrentShape(shapes[Math.floor(Math.random() * shapes.length)]), 1000);
              }}
            >
              {emojiMap[s]}
            </Button>
          ))}
        </div>
      </Wrapper>
    );
  }

  // ===== Сортировка =====
  if (currentExercise === "sort") {
    const sizes = useMemo(() => {
      const arr = [
        { size: 1, label: "🟢", scale: "text-3xl" },
        { size: 2, label: "🟢", scale: "text-5xl" },
        { size: 3, label: "🟢", scale: "text-7xl" },
      ];
      return [...arr].sort(() => Math.random() - 0.5);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortRound]);

    const nextNeeded = sortClicked.length + 1;

    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-2xl font-bold mb-2">Разложи от маленького к большому</h2>
        <p className="text-muted-foreground mb-6">Нажми сначала на самый маленький</p>
        <div className="flex justify-center gap-6 items-end mb-6 min-h-[160px]">
          {sizes.map((s, idx) => {
            const clickedIdx = sortClicked.indexOf(s.size);
            return (
              <button
                key={idx}
                disabled={clickedIdx >= 0}
                onClick={() => {
                  if (s.size === nextNeeded) {
                    const next = [...sortClicked, s.size];
                    setSortClicked(next);
                    if (next.length === 3) {
                      reward("Молодец");
                      setTotal((t) => t + 1);
                      logCorrectAnswer({ section: "math", level: 1, exercise: "sort" });
                      setTimeout(() => {
                        setSortClicked([]);
                        setSortRound((r) => r + 1);
                      }, 1500);
                    }
                  } else {
                    setTotal((t) => t + 1);
                    wrong("сначала меньший");
                    logWrongAnswer({ section: "math", level: 1, exercise: "sort" });
                    setSortClicked([]);
                  }
                }}
                className={`${s.scale} transition-all ${clickedIdx >= 0 ? "opacity-30" : "hover:scale-110"}`}
              >
                {s.label}
                {clickedIdx >= 0 && <div className="text-base font-bold text-primary">{clickedIdx + 1}</div>}
              </button>
            );
          })}
        </div>
      </Wrapper>
    );
  }

  // ===== Сравнение =====
  if (currentExercise === "compare") {
    const round = useMemo(() => {
      const a = Math.floor(Math.random() * 5) + 1;
      let b = Math.floor(Math.random() * 5) + 1;
      while (b === a) b = Math.floor(Math.random() * 5) + 1;
      const fruit = ["🍎", "🍐", "🍊", "🍇", "🍓"][Math.floor(Math.random() * 5)];
      return { a, b, fruit, bigger: a > b ? "a" : "b" };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [compareRound]);

    const pick = (side: "a" | "b") => {
      setTotal((t) => t + 1);
      if (side === round.bigger) {
        reward("Точно");
        logCorrectAnswer({ section: "math", level: 1, exercise: "compare" });
      } else {
        wrong(`Группа ${round.bigger === "a" ? "слева" : "справа"}`);
        logWrongAnswer({ section: "math", level: 1, exercise: "compare" });
      }
      setTimeout(() => setCompareRound((r) => r + 1), 1200);
    };

    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-2xl font-bold mb-6">Где фруктов больше?</h2>
        <div className="grid grid-cols-2 gap-4">
          {(["a", "b"] as const).map((side) => (
            <button
              key={side}
              onClick={() => pick(side)}
              className="p-6 rounded-2xl border-4 border-yellow-400/40 bg-yellow-50 hover:bg-yellow-100 transition-all"
            >
              <div className="text-4xl flex flex-wrap gap-1 justify-center">
                {Array(round[side]).fill(round.fruit).map((f, i) => <span key={i}>{f}</span>)}
              </div>
              <div className="text-sm text-muted-foreground mt-3">Нажми, если здесь больше</div>
            </button>
          ))}
        </div>
      </Wrapper>
    );
  }

  return null;
};

const Wrapper = ({ children, score, total, onBack }: { children: React.ReactNode; score: number; total: number; onBack: () => void }) => (
  <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-background p-4">
    <div className="container mx-auto max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <div className="text-lg font-semibold">Счёт: {score} / {total}</div>
      </div>
      <Card className="p-8 text-center">{children}</Card>
    </div>
  </div>
);
