import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useActivityTracker } from "@/hooks/useActivityTracker";

type ExerciseType = "abacus" | "building" | "3dshapes" | "patterns";

interface Level2ExercisesProps {
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

export const Level2Exercises = ({ onBack }: Level2ExercisesProps) => {
  const { toast } = useToast();
  const { addStars } = useUserProgress();
  const { logCorrectAnswer, logWrongAnswer } = useActivityTracker();
  const [currentExercise, setCurrentExercise] = useState<ExerciseType | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  const [abacusNumber, setAbacusNumber] = useState(Math.floor(Math.random() * 10) + 1);
  const [buildingProblem, setBuildingProblem] = useState(generateBuildingProblem());
  const [shape3dRound, setShape3dRound] = useState(0);
  const [patternRound, setPatternRound] = useState(0);

  function generateBuildingProblem() {
    const n1 = Math.floor(Math.random() * 5) + 1;
    const n2 = Math.floor(Math.random() * 5) + 1;
    const add = Math.random() > 0.5;
    if (add) return { question: `${n1} + ${n2}`, answer: n1 + n2 };
    const lg = Math.max(n1, n2), sm = Math.min(n1, n2);
    return { question: `${lg} - ${sm}`, answer: lg - sm };
  }

  const reward = (msg: string) => {
    addStars(1);
    setScore((s) => s + 1);
    speak("Правильно!");
    toast({ title: msg + " 🎉", description: "+1 ⭐" });
  };

  const wrong = (correct: string) => {
    speak("Попробуй ещё раз!");
    toast({ title: "Попробуй ещё! 💪", description: `Правильно: ${correct}`, variant: "destructive" });
  };

  const checkAnswer = (selected: number, correct: number) => {
    setTotal((t) => t + 1);
    if (selected === correct) {
      reward("Молодец");
      logCorrectAnswer({ section: "math", level: 2, answer: selected });
    } else {
      wrong(String(correct));
      logWrongAnswer({ section: "math", level: 2, answer: selected, correct });
    }
  };

  const exercises = [
    { type: "abacus" as ExerciseType, title: "Счёты-абак", description: "Считаем до 10 вместе", emoji: "🧮" },
    { type: "building" as ExerciseType, title: "Строим домики", description: "Сложение и вычитание", emoji: "🏗️" },
    { type: "3dshapes" as ExerciseType, title: "Объёмные фигуры", description: "Куб, шар, пирамида", emoji: "🎲" },
    { type: "patterns" as ExerciseType, title: "Узоры", description: "Найди закономерность", emoji: "🔢" },
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
            <div className="text-6xl mb-4 animate-bounce-gentle">🎯</div>
            <h1 className="text-4xl font-bold mb-2">Юный математик</h1>
            <p className="text-lg text-muted-foreground">4-5 лет</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exercises.map((ex) => (
              <Card
                key={ex.type}
                className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-blue-400/30 bg-gradient-to-br from-blue-100/50 to-cyan-100/50"
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
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-2xl font-bold mb-6">Посчитай шарики на абаке!</h2>
        <div className="flex justify-center gap-1 mb-8 text-4xl flex-wrap max-w-md mx-auto">
          {[...Array(abacusNumber)].map((_, i) => <span key={i}>🟠</span>)}
        </div>
        <div className="grid grid-cols-5 gap-3 max-w-md mx-auto">
          {[...Array(10)].map((_, i) => (
            <Button
              key={i}
              size="lg"
              className="text-2xl h-16"
              onClick={() => {
                checkAnswer(i + 1, abacusNumber);
                setTimeout(() => setAbacusNumber(Math.floor(Math.random() * 10) + 1), 1200);
              }}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      </Wrapper>
    );
  }

  if (currentExercise === "building") {
    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-2xl font-bold mb-6">Строим домики!</h2>
        <div className="text-6xl mb-8">{buildingProblem.question} = ?</div>
        <div className="grid grid-cols-5 gap-3 max-w-md mx-auto">
          {[...Array(10)].map((_, i) => (
            <Button
              key={i}
              size="lg"
              className="text-2xl h-16"
              onClick={() => {
                checkAnswer(i + 1, buildingProblem.answer);
                setTimeout(() => setBuildingProblem(generateBuildingProblem()), 1500);
              }}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      </Wrapper>
    );
  }

  if (currentExercise === "3dshapes") {
    const shapes3d = useMemo(() => {
      const all = [
        { name: "куб", emoji: "🎲" },
        { name: "шар", emoji: "⚽" },
        { name: "пирамида", emoji: "🔺" },
        { name: "цилиндр", emoji: "🥫" },
      ];
      const target = all[Math.floor(Math.random() * all.length)];
      const opts = [...all].sort(() => Math.random() - 0.5);
      return { target, opts };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shape3dRound]);

    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-2xl font-bold mb-6">Найди фигуру: <span className="text-primary">{shapes3d.target.name}</span></h2>
        <Button size="sm" variant="outline" onClick={() => speak(`Найди ${shapes3d.target.name}`)} className="mb-6">
          🔊 Повторить
        </Button>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {shapes3d.opts.map((s, i) => (
            <Button
              key={i}
              className="h-32 text-7xl"
              variant="outline"
              onClick={() => {
                setTotal((t) => t + 1);
                if (s.name === shapes3d.target.name) {
                  reward("Точно");
                  logCorrectAnswer({ section: "math", level: 2, exercise: "3dshapes", shape: s.name });
                } else {
                  wrong(shapes3d.target.name);
                  logWrongAnswer({ section: "math", level: 2, exercise: "3dshapes", shape: s.name, correct: shapes3d.target.name });
                }
                setTimeout(() => setShape3dRound((r) => r + 1), 1200);
              }}
            >
              {s.emoji}
            </Button>
          ))}
        </div>
      </Wrapper>
    );
  }

  if (currentExercise === "patterns") {
    const pattern = useMemo(() => {
      const palette = ["🔴", "🔵", "🟡", "🟢"];
      const [a, b] = [palette[Math.floor(Math.random() * 4)], palette[Math.floor(Math.random() * 4)]];
      const seq = [a, b, a, b, a];
      const next = b;
      const opts = [...new Set([next, ...palette])].slice(0, 4).sort(() => Math.random() - 0.5);
      return { seq, next, opts };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patternRound]);

    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-2xl font-bold mb-6">Что дальше в узоре?</h2>
        <div className="flex justify-center gap-2 mb-8 text-5xl">
          {pattern.seq.map((c, i) => <span key={i}>{c}</span>)}
          <span className="text-muted-foreground">?</span>
        </div>
        <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
          {pattern.opts.map((c, i) => (
            <Button
              key={i}
              className="h-20 text-4xl"
              variant="outline"
              onClick={() => {
                setTotal((t) => t + 1);
                if (c === pattern.next) {
                  reward("Точно");
                  logCorrectAnswer({ section: "math", level: 2, exercise: "patterns" });
                } else {
                  wrong(pattern.next);
                  logWrongAnswer({ section: "math", level: 2, exercise: "patterns", correct: pattern.next });
                }
                setTimeout(() => setPatternRound((r) => r + 1), 1200);
              }}
            >
              {c}
            </Button>
          ))}
        </div>
      </Wrapper>
    );
  }

  return null;
};

const Wrapper = ({ children, score, total, onBack }: { children: React.ReactNode; score: number; total: number; onBack: () => void }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-background p-4">
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
