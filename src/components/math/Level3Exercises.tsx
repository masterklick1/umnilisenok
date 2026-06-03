import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useActivityTracker } from "@/hooks/useActivityTracker";

type ExerciseType = "count20" | "problems" | "measurement" | "charts";

interface Level3ExercisesProps {
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

export const Level3Exercises = ({ onBack }: Level3ExercisesProps) => {
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
    speak("Попробуй ещё раз!");
    toast({ title: "Подумай ещё 💪", description: `Правильно: ${correct}`, variant: "destructive" });
  };

  const handle = (ok: boolean, correct: string, ex: string) => {
    setTotal((t) => t + 1);
    if (ok) { reward("Молодец"); logCorrectAnswer({ section: "math", level: 3, exercise: ex }); }
    else { wrong(correct); logWrongAnswer({ section: "math", level: 3, exercise: ex, correct }); }
    setTimeout(() => setRound((r) => r + 1), 1300);
  };

  const exercises = [
    { type: "count20" as ExerciseType, title: "Счёт до 20", description: "Десятки и единицы", emoji: "🔢" },
    { type: "problems" as ExerciseType, title: "Решаем задачи", description: "Сложение и вычитание", emoji: "📝" },
    { type: "measurement" as ExerciseType, title: "Измеряем", description: "Длина и размер", emoji: "📏" },
    { type: "charts" as ExerciseType, title: "Графики", description: "Простые диаграммы", emoji: "📊" },
  ];

  if (!currentExercise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-background p-4">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" onClick={onBack} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Выбрать уровень
          </Button>
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 animate-bounce-gentle">🧮</div>
            <h1 className="text-4xl font-bold mb-2">Умный математик</h1>
            <p className="text-lg text-muted-foreground">5-6 лет</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exercises.map((ex) => (
              <Card
                key={ex.type}
                className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-green-400/30 bg-gradient-to-br from-green-100/50 to-emerald-100/50"
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

  // ===== Счёт до 20 =====
  if (currentExercise === "count20") {
    const r = useMemo(() => {
      const n = Math.floor(Math.random() * 20) + 1;
      const tens = Math.floor(n / 10);
      const ones = n % 10;
      const opts = new Set<number>([n]);
      while (opts.size < 4) opts.add(Math.max(1, Math.min(20, n + Math.floor(Math.random() * 7) - 3)));
      return { n, tens, ones, opts: [...opts].sort(() => Math.random() - 0.5) };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round]);
    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-2xl font-bold mb-6">Сколько здесь?</h2>
        <div className="flex flex-col items-center gap-3 mb-6">
          {r.tens > 0 && (
            <div className="flex gap-1 flex-wrap justify-center">
              {[...Array(r.tens)].map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-0.5 p-2 bg-primary/10 rounded">
                  {[...Array(10)].map((_, j) => <span key={j} className="text-xl">🟦</span>)}
                </div>
              ))}
            </div>
          )}
          {r.ones > 0 && (
            <div className="flex gap-1 flex-wrap justify-center text-xl">
              {[...Array(r.ones)].map((_, i) => <span key={i}>🟧</span>)}
            </div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {r.opts.map((o) => (
            <Button key={o} size="lg" className="text-2xl h-16"
              onClick={() => handle(o === r.n, String(r.n), "count20")}>{o}</Button>
          ))}
        </div>
      </Wrapper>
    );
  }

  // ===== Задачи =====
  if (currentExercise === "problems") {
    const r = useMemo(() => {
      const a = Math.floor(Math.random() * 6) + 2;
      const b = Math.floor(Math.random() * 5) + 1;
      const add = Math.random() > 0.5;
      const subjects = [
        { name: "морковок у зайки", emoji: "🥕" },
        { name: "яблок в корзинке", emoji: "🍎" },
        { name: "цветов в саду", emoji: "🌸" },
      ];
      const s = subjects[Math.floor(Math.random() * subjects.length)];
      const story = add
        ? `Было ${a} ${s.name}, добавили ещё ${b}. Сколько стало?`
        : `Было ${a + b} ${s.name}, ${b} забрали. Сколько осталось?`;
      const ans = add ? a + b : a;
      const opts = new Set<number>([ans]);
      while (opts.size < 4) opts.add(Math.max(1, ans + Math.floor(Math.random() * 5) - 2));
      return { story, ans, opts: [...opts].sort(() => Math.random() - 0.5), s };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round]);
    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <div className="text-6xl mb-4">{r.s.emoji}</div>
        <h2 className="text-xl font-semibold mb-2">{r.story}</h2>
        <Button size="sm" variant="outline" onClick={() => speak(r.story)} className="mb-6">🔊 Повторить</Button>
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {r.opts.map((o) => (
            <Button key={o} size="lg" className="text-2xl h-16"
              onClick={() => handle(o === r.ans, String(r.ans), "problems")}>{o}</Button>
          ))}
        </div>
      </Wrapper>
    );
  }

  // ===== Измерения =====
  if (currentExercise === "measurement") {
    const r = useMemo(() => {
      const modes = [
        { q: "Что длиннее?", items: [{ e: "🚂", v: 5 }, { e: "🚗", v: 2 }, { e: "✏️", v: 1 }] },
        { q: "Что тяжелее?", items: [{ e: "🐘", v: 5 }, { e: "🐈", v: 2 }, { e: "🐭", v: 1 }] },
        { q: "Что выше?", items: [{ e: "🌳", v: 5 }, { e: "🌷", v: 2 }, { e: "🍄", v: 1 }] },
      ];
      const m = modes[Math.floor(Math.random() * modes.length)];
      const shuffled = [...m.items].sort(() => Math.random() - 0.5);
      const max = Math.max(...shuffled.map((x) => x.v));
      return { q: m.q, items: shuffled, correctEmoji: shuffled.find((x) => x.v === max)!.e };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round]);
    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-2xl font-bold mb-6">{r.q}</h2>
        <div className="grid grid-cols-3 gap-4">
          {r.items.map((it, i) => (
            <Button key={i} variant="outline" className="h-32 text-7xl"
              onClick={() => handle(it.e === r.correctEmoji, r.correctEmoji, "measurement")}>{it.e}</Button>
          ))}
        </div>
      </Wrapper>
    );
  }

  // ===== Графики =====
  if (currentExercise === "charts") {
    const r = useMemo(() => {
      const labels = ["🍎", "🍌", "🍇"];
      const values = labels.map(() => Math.floor(Math.random() * 5) + 1);
      const maxIdx = values.indexOf(Math.max(...values));
      return { labels, values, correct: labels[maxIdx] };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round]);
    return (
      <Wrapper score={score} total={total} onBack={() => setCurrentExercise(null)}>
        <h2 className="text-2xl font-bold mb-6">Чего больше всего?</h2>
        <div className="flex justify-center gap-6 items-end mb-6 h-48">
          {r.labels.map((l, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="bg-primary rounded-t-lg w-12" style={{ height: `${r.values[i] * 28}px` }} />
              <div className="text-3xl">{l}</div>
              <div className="text-sm text-muted-foreground">{r.values[i]}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {r.labels.map((l) => (
            <Button key={l} variant="outline" className="h-16 text-4xl"
              onClick={() => handle(l === r.correct, r.correct, "charts")}>{l}</Button>
          ))}
        </div>
      </Wrapper>
    );
  }
  return null;
};

const Wrapper = ({ children, score, total, onBack }: { children: React.ReactNode; score: number; total: number; onBack: () => void }) => (
  <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-background p-4">
    <div className="container mx-auto max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
        <div className="text-lg font-semibold">Счёт: {score} / {total}</div>
      </div>
      <Card className="p-8 text-center">{children}</Card>
    </div>
  </div>
);
