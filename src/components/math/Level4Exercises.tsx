import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useActivityTracker } from "@/hooks/useActivityTracker";

type ExerciseType = "count100" | "multiplication" | "puzzles" | "spatial";

interface Level4ExercisesProps {
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

export const Level4Exercises = ({ onBack }: Level4ExercisesProps) => {
  const { toast } = useToast();
  const { addStars } = useUserProgress();
  const { logCorrectAnswer, logWrongAnswer } = useActivityTracker();
  const [currentExercise, setCurrentExercise] = useState<ExerciseType | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [round, setRound] = useState(0);

  const reward = (msg: string) => {
    addStars(1, "math");
    setScore((s) => s + 1);
    speak("Правильно!");
    toast({ title: msg + " 🎉", description: "+1 ⭐" });
  };
  const wrong = (correct: string) => {
    speak("Подумай ещё раз!");
    toast({ title: "Подумай ещё 💪", description: `Правильно: ${correct}`, variant: "destructive" });
  };
  const handle = (ok: boolean, correct: string, ex: string) => {
    setTotal((t) => t + 1);
    if (ok) { reward("Отлично"); logCorrectAnswer({ section: "math", level: 4, exercise: ex }); }
    else { wrong(correct); logWrongAnswer({ section: "math", level: 4, exercise: ex, correct }); }
    setTimeout(() => setRound((r) => r + 1), 1300);
  };

  const exercises = [
    { type: "count100" as ExerciseType, title: "Счёт до 100", description: "Чётные и нечётные", emoji: "💯" },
    { type: "multiplication" as ExerciseType, title: "Умножение", description: "Группы одинаковых", emoji: "✖️" },
    { type: "puzzles" as ExerciseType, title: "Головоломки", description: "Что дальше?", emoji: "🧩" },
    { type: "spatial" as ExerciseType, title: "Пространство", description: "Зеркальные фигуры", emoji: "🎲" },
  ];

  if (!currentExercise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-background p-4">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" onClick={onBack} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Выбрать уровень
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
                className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-purple-400/30 bg-gradient-to-br from-purple-100/50 to-pink-100/50"
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

  // ===== Чётные/нечётные =====
  if (currentExercise === "count100") {
    const r = useMemo(() => {
      const n = Math.floor(Math.random() * 99) + 1;
      return { n, even: n % 2 === 0 };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round]);
    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-xl font-semibold mb-3">Это число чётное или нечётное?</h2>
        <div className="text-8xl font-bold text-primary mb-8">{r.n}</div>
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <Button size="lg" className="h-20 text-2xl"
            onClick={() => handle(r.even, r.even ? "чётное" : "нечётное", "count100")}>Чётное</Button>
          <Button size="lg" variant="outline" className="h-20 text-2xl"
            onClick={() => handle(!r.even, r.even ? "чётное" : "нечётное", "count100")}>Нечётное</Button>
        </div>
      </Wrapper>
    );
  }

  // ===== Умножение через группы =====
  if (currentExercise === "multiplication") {
    const r = useMemo(() => {
      const a = Math.floor(Math.random() * 4) + 2;
      const b = Math.floor(Math.random() * 4) + 2;
      const emoji = ["🍓", "⭐", "🍎", "🌸"][Math.floor(Math.random() * 4)];
      const ans = a * b;
      const opts = new Set<number>([ans]);
      while (opts.size < 4) opts.add(Math.max(1, ans + Math.floor(Math.random() * 7) - 3));
      return { a, b, ans, emoji, opts: [...opts].sort(() => Math.random() - 0.5) };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round]);
    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-xl font-semibold mb-4">{r.a} групп(ы) по {r.b} = ?</h2>
        <div className="flex flex-col items-center gap-2 mb-6">
          {[...Array(r.a)].map((_, i) => (
            <div key={i} className="flex gap-1 text-3xl">
              {[...Array(r.b)].map((_, j) => <span key={j}>{r.emoji}</span>)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {r.opts.map((o) => (
            <Button key={o} size="lg" className="text-2xl h-16"
              onClick={() => handle(o === r.ans, String(r.ans), "multiplication")}>{o}</Button>
          ))}
        </div>
      </Wrapper>
    );
  }

  // ===== Головоломки (числовая последовательность) =====
  if (currentExercise === "puzzles") {
    const r = useMemo(() => {
      const start = Math.floor(Math.random() * 5) + 1;
      const step = [1, 2, 2, 3, 5][Math.floor(Math.random() * 5)];
      const seq = [start, start + step, start + 2 * step, start + 3 * step];
      const next = start + 4 * step;
      const opts = new Set<number>([next]);
      while (opts.size < 4) opts.add(Math.max(0, next + Math.floor(Math.random() * 7) - 3));
      return { seq, next, opts: [...opts].sort(() => Math.random() - 0.5) };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round]);
    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-xl font-semibold mb-6">Какое число продолжит ряд?</h2>
        <div className="flex justify-center gap-3 mb-8 text-4xl font-bold">
          {r.seq.map((n, i) => <span key={i} className="px-3 py-2 bg-primary/10 rounded-lg">{n}</span>)}
          <span className="text-muted-foreground px-3 py-2">?</span>
        </div>
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {r.opts.map((o) => (
            <Button key={o} size="lg" className="text-2xl h-16"
              onClick={() => handle(o === r.next, String(r.next), "puzzles")}>{o}</Button>
          ))}
        </div>
      </Wrapper>
    );
  }

  // ===== Пространство (зеркало) =====
  if (currentExercise === "spatial") {
    const r = useMemo(() => {
      const figures = ["🐶", "🚗", "🌳", "⭐", "🎈"];
      const target = figures[Math.floor(Math.random() * figures.length)];
      const opts = [...figures].sort(() => Math.random() - 0.5).slice(0, 4);
      if (!opts.includes(target)) opts[0] = target;
      return { target, opts: opts.sort(() => Math.random() - 0.5) };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round]);
    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-xl font-semibold mb-4">Найди такую же фигуру в зеркале</h2>
        <div className="flex justify-center items-center gap-4 mb-6">
          <span className="text-7xl">{r.target}</span>
          <span className="text-3xl text-muted-foreground">🪞</span>
          <span className="text-7xl scale-x-[-1] inline-block">{r.target}</span>
        </div>
        <p className="text-muted-foreground mb-4">Найди фигуру, которую видишь в зеркале</p>
        <div className="grid grid-cols-4 gap-4 max-w-xl mx-auto">
          {r.opts.map((o, i) => (
            <Button key={i} variant="outline" className="h-24 text-6xl"
              onClick={() => handle(o === r.target, r.target, "spatial")}>{o}</Button>
          ))}
        </div>
      </Wrapper>
    );
  }
  return null;
};

const Wrapper = ({ children, score, total, onBack }: { children: React.ReactNode; score: number; total: number; onBack: () => void }) => (
  <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-background p-4">
    <div className="container mx-auto max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
        <div className="text-lg font-semibold">Счёт: {score} / {total}</div>
      </div>
      <Card className="p-8 text-center">{children}</Card>
    </div>
  </div>
);
