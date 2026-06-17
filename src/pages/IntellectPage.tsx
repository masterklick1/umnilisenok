import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useUserProgress } from "@/hooks/useUserProgress";
import { speak } from "@/lib/sound";

type Mode = "odd" | "sequence" | "memory" | "count" | null;

const playJoy = () => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [523, 659, 784].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.type = "sine";
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
      o.start(ctx.currentTime + i * 0.12);
      o.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch {
    /* noop */
  }
};

// --- "Найди лишнее" ---
const oddPuzzles = [
  { items: ["🍎", "🍌", "🍇", "🚗"], odd: 3, hint: "Три фрукта и машина" },
  { items: ["🐶", "🐱", "🐰", "🌳"], odd: 3, hint: "Три животных и дерево" },
  { items: ["⚽", "🏀", "🎾", "🍕"], odd: 3, hint: "Три мяча и пицца" },
  { items: ["🚗", "🚌", "🚲", "🐟"], odd: 3, hint: "Три транспорта и рыба" },
  { items: ["☀️", "⭐", "🌙", "🍎"], odd: 3, hint: "Три на небе и яблоко" },
  { items: ["🔴", "🔴", "🔵", "🔴"], odd: 2, hint: "Три красных и один синий" },
  { items: ["🐝", "🦋", "🐞", "🐟"], odd: 3, hint: "Три насекомых и рыбка" },
  { items: ["🚗", "🐱", "🚕", "🚙"], odd: 1, hint: "Три машины и кот" },
  { items: ["🌹", "🐶", "🌻", "🌷"], odd: 1, hint: "Три цветка и собака" },
  { items: ["🥕", "🥦", "🎈", "🌽"], odd: 2, hint: "Три овоща и шарик" },
  { items: ["✈️", "🚁", "🐢", "🚀"], odd: 2, hint: "Три летающих и черепаха" },
  { items: ["📕", "📗", "🍔", "📘"], odd: 2, hint: "Три книги и бургер" },
  { items: ["🎸", "🥁", "🎺", "🍦"], odd: 3, hint: "Три инструмента и мороженое" },
  { items: ["🦁", "🐯", "🐻", "🚲"], odd: 3, hint: "Три зверя и велосипед" },
  { items: ["🐟", "🐠", "🐬", "🐔"], odd: 3, hint: "Три из моря и курица" },
  { items: ["🍓", "🍒", "⚽", "🍑"], odd: 2, hint: "Три ягоды и мяч" },
  { items: ["🔺", "🔺", "🔵", "🔺"], odd: 2, hint: "Три треугольника и круг" },
  { items: ["👕", "🍕", "👖", "🧦"], odd: 1, hint: "Три вещи и пицца" },
  { items: ["🍇", "🍉", "🐮", "🍍"], odd: 2, hint: "Три фрукта и корова" },
  { items: ["⭐", "🚌", "🌙", "☀️"], odd: 1, hint: "Три на небе и автобус" },
  { items: ["🐔", "🦆", "🦉", "🐴"], odd: 3, hint: "Три птицы и лошадь" },
  { items: ["🍞", "🧀", "🥚", "🚲"], odd: 3, hint: "Три продукта и велосипед" },
  { items: ["👟", "👞", "🍎", "🥾"], odd: 2, hint: "Три обуви и яблоко" },
  { items: ["🌧️", "❄️", "☀️", "🐱"], odd: 3, hint: "Три погоды и кот" },
  { items: ["🎹", "🎻", "🍔", "🎸"], odd: 2, hint: "Три инструмента и бургер" },
  { items: ["🐸", "🐢", "🐍", "🦅"], odd: 3, hint: "Три ползучих и орёл" },
  { items: ["🍅", "🥒", "🥔", "🍰"], odd: 3, hint: "Три овоща и торт" },
  { items: ["🚂", "🚃", "🚄", "🐶"], odd: 3, hint: "Три поезда и собака" },
  { items: ["⚪", "⚪", "⚫", "⚪"], odd: 2, hint: "Три белых и чёрный" },
  { items: ["🟩", "🟩", "🟩", "🟥"], odd: 3, hint: "Три зелёных и красный" },
  { items: ["🍯", "🍪", "🍩", "🧦"], odd: 3, hint: "Три сладких и носок" },
  { items: ["🦷", "👁️", "👂", "🚗"], odd: 3, hint: "Три части тела и машина" },
  { items: ["🌻", "🌼", "🐝", "🌹"], odd: 2, hint: "Три цветка и пчела" },
  { items: ["📚", "✏️", "📒", "🍌"], odd: 3, hint: "Три для учёбы и банан" },
  { items: ["🐮", "🐷", "🐑", "🦈"], odd: 3, hint: "Три домашних и акула" },
  { items: ["🎈", "🎁", "🎂", "🥦"], odd: 3, hint: "Три праздничных и брокколи" },
];

const OddOneOut = ({ onAnswer }: { onAnswer: (correct: boolean) => void }) => {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * oddPuzzles.length));
  const [locked, setLocked] = useState<number | null>(null);
  const puzzle = oddPuzzles[idx];

  const handle = (i: number) => {
    if (locked !== null) return;
    setLocked(i);
    const correct = i === puzzle.odd;
    onAnswer(correct);
    setTimeout(() => {
      setLocked(null);
      setIdx(Math.floor(Math.random() * oddPuzzles.length));
    }, 1500);
  };

  return (
    <Card className="p-8 text-center">
      <h3 className="text-2xl font-bold mb-2">Найди лишнее</h3>
      <p className="text-muted-foreground mb-6">Что не подходит?</p>
      <div className="grid grid-cols-4 gap-4">
        {puzzle.items.map((emoji, i) => (
          <button
            key={i}
            onClick={() => handle(i)}
            disabled={locked !== null}
            className={`text-6xl p-4 rounded-2xl transition-all bg-muted hover:bg-primary/20 ${
              locked === i ? (i === puzzle.odd ? "bg-green-200 scale-110" : "bg-red-200") : ""
            } ${locked !== null && i === puzzle.odd ? "ring-4 ring-green-500" : ""}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </Card>
  );
};

// --- "Продолжи последовательность" ---
const sequencePuzzles = [
  { seq: ["🔴", "🔵", "🔴", "🔵", "?"], options: ["🔴", "🔵", "🟢"], answer: 0 },
  { seq: ["⭐", "⭐", "🌙", "⭐", "⭐", "?"], options: ["⭐", "🌙", "☀️"], answer: 1 },
  { seq: ["🐱", "🐶", "🐱", "🐶", "?"], options: ["🐰", "🐱", "🐶"], answer: 1 },
  { seq: ["🟡", "🟡", "🟢", "🟡", "🟡", "?"], options: ["🟡", "🟢", "🔵"], answer: 1 },
  { seq: ["1️⃣", "2️⃣", "3️⃣", "?"], options: ["5️⃣", "4️⃣", "6️⃣"], answer: 1 },
  { seq: ["🍎", "🍌", "🍎", "🍌", "?"], options: ["🍇", "🍎", "🍓"], answer: 1 },
  { seq: ["🟢", "🟡", "🟢", "🟡", "?"], options: ["🟢", "🟡", "🔴"], answer: 0 },
  { seq: ["🔺", "🔵", "🔺", "🔵", "?"], options: ["🔵", "🔺", "🟢"], answer: 1 },
  { seq: ["🐰", "🐰", "🐢", "🐰", "🐰", "?"], options: ["🐰", "🐢", "🐱"], answer: 1 },
  { seq: ["☀️", "🌙", "☀️", "🌙", "?"], options: ["⭐", "☀️", "🌙"], answer: 1 },
  { seq: ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "?"], options: ["6️⃣", "5️⃣", "7️⃣"], answer: 1 },
  { seq: ["🔴", "🟠", "🟡", "🟢", "?"], options: ["🔵", "🟤", "⚪"], answer: 0 },
  { seq: ["🐶", "🐱", "🐭", "🐶", "🐱", "?"], options: ["🐭", "🐶", "🐱"], answer: 0 },
  { seq: ["⬆️", "⬇️", "⬆️", "⬇️", "?"], options: ["➡️", "⬆️", "⬇️"], answer: 1 },
  { seq: ["🥝", "🍓", "🥝", "🍓", "?"], options: ["🍓", "🥝", "🍒"], answer: 1 },
  { seq: ["😀", "😴", "😀", "😴", "?"], options: ["😀", "😴", "😡"], answer: 0 },
  { seq: ["🟦", "🟦", "🟥", "🟦", "🟦", "?"], options: ["🟦", "🟥", "🟩"], answer: 1 },
  { seq: ["🍦", "🍩", "🍦", "🍩", "?"], options: ["🍰", "🍦", "🍩"], answer: 1 },
  { seq: ["🐤", "🐤", "🐤", "?"], options: ["🐤", "🐶", "🐱"], answer: 0 },
  { seq: ["🔵", "🔵", "🟢", "🔵", "🔵", "?"], options: ["🔵", "🟢", "🔴"], answer: 1 },
  { seq: ["🌟", "🌙", "🌟", "🌙", "?"], options: ["🌙", "🌟", "☀️"], answer: 1 },
  { seq: ["🍒", "🍋", "🍒", "🍋", "?"], options: ["🍋", "🍒", "🍓"], answer: 1 },
  { seq: ["⬅️", "➡️", "⬅️", "➡️", "?"], options: ["⬆️", "⬅️", "➡️"], answer: 1 },
  { seq: ["🟪", "🟨", "🟪", "🟨", "?"], options: ["🟪", "🟨", "🟥"], answer: 0 },
  { seq: ["🐕", "🐈", "🐕", "🐈", "?"], options: ["🐈", "🐕", "🐁"], answer: 1 },
  { seq: ["1️⃣", "1️⃣", "2️⃣", "2️⃣", "3️⃣", "?"], options: ["3️⃣", "4️⃣", "5️⃣"], answer: 0 },
  { seq: ["🚗", "🚕", "🚗", "🚕", "?"], options: ["🚌", "🚗", "🚕"], answer: 1 },
  { seq: ["❤️", "💙", "❤️", "💙", "?"], options: ["💚", "❤️", "💙"], answer: 1 },
  { seq: ["🌸", "🌿", "🌸", "🌿", "?"], options: ["🌿", "🌸", "🌹"], answer: 1 },
  { seq: ["⚽", "🏀", "⚽", "🏀", "?"], options: ["🎾", "⚽", "🏀"], answer: 1 },
];

const Sequence = ({ onAnswer }: { onAnswer: (correct: boolean) => void }) => {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * sequencePuzzles.length));
  const [locked, setLocked] = useState<number | null>(null);
  const puzzle = sequencePuzzles[idx];

  const handle = (i: number) => {
    if (locked !== null) return;
    setLocked(i);
    const correct = i === puzzle.answer;
    onAnswer(correct);
    setTimeout(() => {
      setLocked(null);
      setIdx(Math.floor(Math.random() * sequencePuzzles.length));
    }, 1500);
  };

  return (
    <Card className="p-8 text-center">
      <h3 className="text-2xl font-bold mb-2">Продолжи ряд</h3>
      <p className="text-muted-foreground mb-6">Что идёт следующим?</p>
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {puzzle.seq.map((s, i) => (
          <div
            key={i}
            className={`text-5xl p-3 rounded-xl ${s === "?" ? "bg-primary/20 animate-pulse" : "bg-muted"}`}
          >
            {s}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {puzzle.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handle(i)}
            disabled={locked !== null}
            className={`text-5xl p-4 rounded-2xl transition-all bg-muted hover:bg-primary/20 ${
              locked === i ? (i === puzzle.answer ? "bg-green-200 scale-110" : "bg-red-200") : ""
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </Card>
  );
};

// --- Память: найди пару ---
const memoryPool = ["🐶", "🐱", "🐰", "🐻", "🐼", "🦁", "🦊", "🐯", "🐸", "🐵", "🐷", "🦄", "🐮", "🐔", "🦉", "🐢"];

const MemoryGame = ({ onAnswer }: { onAnswer: (correct: boolean) => void }) => {
  const cards = useMemo(() => {
    const chosen = [...memoryPool].sort(() => Math.random() - 0.5).slice(0, 8);
    const pairs = [...chosen, ...chosen];
    return pairs
      .sort(() => Math.random() - 0.5)
      .map((emoji, id) => ({ id, emoji }));
  }, []);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [reportedWin, setReportedWin] = useState(false);

  useEffect(() => {
    if (flipped.length === 2) {
      const [a, b] = flipped;
      if (cards[a].emoji === cards[b].emoji) {
        setMatched((m) => [...m, a, b]);
        onAnswer(true);
        setTimeout(() => setFlipped([]), 700);
      } else {
        onAnswer(false);
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  }, [flipped, cards, onAnswer]);

  useEffect(() => {
    if (matched.length === cards.length && !reportedWin) {
      setReportedWin(true);
      speak("Все пары найдены! Молодец!");
    }
  }, [matched, cards.length, reportedWin]);

  const flip = (id: number) => {
    if (flipped.length >= 2 || flipped.includes(id) || matched.includes(id)) return;
    setFlipped((f) => [...f, id]);
  };

  return (
    <Card className="p-6 text-center">
      <h3 className="text-2xl font-bold mb-2">Найди пару</h3>
      <p className="text-muted-foreground mb-6">Открывай по две карточки</p>
      <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
        {cards.map((card, id) => {
          const isOpen = flipped.includes(id) || matched.includes(id);
          return (
            <button
              key={id}
              onClick={() => flip(id)}
              className={`aspect-square text-5xl rounded-2xl transition-all ${
                isOpen
                  ? matched.includes(id)
                    ? "bg-green-100"
                    : "bg-primary/20"
                  : "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground"
              }`}
            >
              {isOpen ? card.emoji : "?"}
            </button>
          );
        })}
      </div>
    </Card>
  );
};

// --- Сосчитай предметы ---
const countEmojis = ["🍎", "⭐", "🎈", "🐰", "🌸", "🚗", "🍓", "🦋", "⚽", "🐥"];

const CountGame = ({ onAnswer }: { onAnswer: (correct: boolean) => void }) => {
  const [round, setRound] = useState(0);
  const [locked, setLocked] = useState<number | null>(null);
  const data = useMemo(() => {
    const count = Math.floor(Math.random() * 7) + 3; // 3..9
    const emoji = countEmojis[Math.floor(Math.random() * countEmojis.length)];
    const opts = new Set<number>([count]);
    while (opts.size < 4) opts.add(Math.max(1, Math.min(10, count + Math.floor(Math.random() * 5) - 2)));
    return { count, emoji, opts: [...opts].sort(() => Math.random() - 0.5) };
  }, [round]);

  const handle = (n: number) => {
    if (locked !== null) return;
    setLocked(n);
    const correct = n === data.count;
    onAnswer(correct);
    setTimeout(() => {
      setLocked(null);
      setRound((r) => r + 1);
    }, 1300);
  };

  return (
    <Card className="p-8 text-center">
      <h3 className="text-2xl font-bold mb-2">Сосчитай</h3>
      <p className="text-muted-foreground mb-6">Сколько здесь предметов?</p>
      <div className="flex justify-center gap-2 mb-8 text-5xl flex-wrap max-w-lg mx-auto">
        {[...Array(data.count)].map((_, i) => (
          <span key={i} className="animate-bounce-gentle" style={{ animationDelay: `${i * 80}ms` }}>
            {data.emoji}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
        {data.opts.map((n) => (
          <button
            key={n}
            onClick={() => handle(n)}
            disabled={locked !== null}
            className={`text-3xl font-bold p-4 rounded-2xl transition-all bg-muted hover:bg-primary/20 ${
              locked === n ? (n === data.count ? "bg-green-200 scale-110" : "bg-red-200") : ""
            } ${locked !== null && n === data.count ? "ring-4 ring-green-500" : ""}`}
          >
            {n}
          </button>
        ))}
      </div>
    </Card>
  );
};

export default function IntellectPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logCorrectAnswer, logWrongAnswer } = useActivityTracker();
  const { addStars } = useUserProgress();
  const [mode, setMode] = useState<Mode>(null);
  const [score, setScore] = useState(0);

  const handleAnswer = (correct: boolean) => {
    if (correct) {
      setScore((s) => s + 1);
      playJoy();
      addStars(1, null);
      logCorrectAnswer({ section: "intellect", mode });
      toast({ title: "Правильно! 🎉", description: "+1 ⭐" });
    } else {
      speak("Попробуй ещё раз!");
      logWrongAnswer({ section: "intellect", mode });
      toast({ title: "Не верно 💪", description: "Попробуй ещё", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50 to-yellow-50 p-4">
      <div className="container mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => (mode ? setMode(null) : navigate("/"))}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
          {mode && (
            <div className="bg-card rounded-full px-4 py-2 shadow font-bold text-primary">
              Очки: {score}
            </div>
          )}
        </div>

        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🧩</div>
          <h1 className="text-4xl font-bold mb-2">Интеллект</h1>
          <p className="text-lg text-muted-foreground">Логика, внимание и память</p>
        </div>

        {!mode && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card
              className="p-6 text-center cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary"
              onClick={() => setMode("odd")}
            >
              <div className="text-5xl mb-3">🔍</div>
              <h3 className="text-xl font-bold">Найди лишнее</h3>
              <p className="text-sm text-muted-foreground mt-2">Внимание</p>
            </Card>
            <Card
              className="p-6 text-center cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary"
              onClick={() => setMode("sequence")}
            >
              <div className="text-5xl mb-3">➡️</div>
              <h3 className="text-xl font-bold">Продолжи ряд</h3>
              <p className="text-sm text-muted-foreground mt-2">Логика</p>
            </Card>
            <Card
              className="p-6 text-center cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary"
              onClick={() => setMode("memory")}
            >
              <div className="text-5xl mb-3">🧠</div>
              <h3 className="text-xl font-bold">Найди пару</h3>
              <p className="text-sm text-muted-foreground mt-2">Память</p>
            </Card>
            <Card
              className="p-6 text-center cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary"
              onClick={() => setMode("count")}
            >
              <div className="text-5xl mb-3">🔢</div>
              <h3 className="text-xl font-bold">Сосчитай</h3>
              <p className="text-sm text-muted-foreground mt-2">Счёт</p>
            </Card>
          </div>
        )}

        {mode === "odd" && <OddOneOut onAnswer={handleAnswer} />}
        {mode === "sequence" && <Sequence onAnswer={handleAnswer} />}
        {mode === "memory" && <MemoryGame onAnswer={handleAnswer} />}
        {mode === "count" && <CountGame onAnswer={handleAnswer} />}
      </div>
    </div>
  );
}
