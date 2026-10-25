import { StreakBonusBanner } from "@/components/StreakBonusBanner";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { speak } from "@/lib/sound";
import {
  VOWELS,
  SIMPLE_SYLLABLES,
  COMPLEX_SYLLABLES,
  READING_WORDS,
  pickRandom,
  shuffleLetters,
  pickPictureOptions,
  pickLetterOptions,
  type ReadingWord,
} from "@/lib/reading-curriculum";

type Level = 1 | 2 | 3 | 4;
const EXERCISES_PER_SESSION = 5;

const LEVELS: {
  level: Level;
  title: string;
  subtitle: string;
  emoji: string;
  bg: string;
}[] = [
  {
    level: 1,
    title: "Гласные буквы",
    subtitle: "А, О, У, Ы, И…",
    emoji: "🔤",
    bg: "from-rose-100 to-orange-100",
  },
  {
    level: 2,
    title: "Простые слоги",
    subtitle: "МА, ПА, КО…",
    emoji: "🧩",
    bg: "from-sky-100 to-cyan-100",
  },
  {
    level: 3,
    title: "Сложные слоги",
    subtitle: "ЛЯ, СТО, КРА…",
    emoji: "⚡",
    bg: "from-amber-100 to-yellow-100",
  },
  {
    level: 4,
    title: "Простые слова",
    subtitle: "КОТ, МАМА, ДОМ…",
    emoji: "📖",
    bg: "from-green-100 to-emerald-100",
  },
];

type Round =
  | { kind: "vowel"; target: string; options: string[] }
  | { kind: "syllable"; target: string }
  | { kind: "word"; word: ReadingWord }
  | { kind: "picture"; word: ReadingWord; options: ReadingWord[] };

const makeRound = (level: Level): Round => {
  if (level === 1) {
    const target = pickRandom(VOWELS);
    return { kind: "vowel", target, options: pickLetterOptions(target, VOWELS) };
  }
  if (level === 2 || level === 3) {
    return {
      kind: "syllable",
      target: pickRandom(level === 2 ? SIMPLE_SYLLABLES : COMPLEX_SYLLABLES),
    };
  }
  // Уровень 4 — чередуем сборку слова и выбор картинки
  const word = pickRandom(READING_WORDS);
  return Math.random() < 0.5
    ? { kind: "word", word }
    : { kind: "picture", word, options: pickPictureOptions(word) };
};

type ResultFn = (ok: boolean, correct: string) => void;

// ===== Уровень 1: послушай и найди гласную =====
const VowelQuiz = ({
  round,
  locked,
  onResult,
}: {
  round: Extract<Round, { kind: "vowel" }>;
  locked: boolean;
  onResult: ResultFn;
}) => {
  useEffect(() => {
    speak(`Буква ${round.target.toLowerCase()}`);
  }, [round.target]);

  return (
    <Card className="p-6 sm:p-8 text-center">
      <p className="text-xl sm:text-2xl text-muted-foreground mb-2">
        Послушай и найди эту букву
      </p>
      <Button
        variant="secondary"
        className="mb-6 gap-2"
        onClick={() => speak(`Буква ${round.target.toLowerCase()}`)}
      >
        <Volume2 className="h-5 w-5" /> Послушать ещё
      </Button>
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {round.options.map((o) => (
          <Button
            key={o}
            size="lg"
            disabled={locked}
            className="text-5xl h-24 font-extrabold"
            onClick={() => onResult(o === round.target, round.target)}
          >
            {o}
          </Button>
        ))}
      </div>
    </Card>
  );
};

// ===== Уровни 2–3 и сборка слов: собери из букв =====
const Builder = ({
  target,
  hint,
  locked,
  onResult,
}: {
  target: string;
  hint?: React.ReactNode;
  locked: boolean;
  onResult: ResultFn;
}) => {
  const tiles = useMemo(
    () => shuffleLetters(target).map((ch, i) => ({ ch, id: i })),
    [target]
  );
  const [picked, setPicked] = useState<{ ch: string; id: number }[]>([]);

  useEffect(() => {
    setPicked([]);
    speak(target.toLowerCase());
  }, [target]);

  const tap = (t: { ch: string; id: number }) => {
    if (locked || picked.some((p) => p.id === t.id)) return;
    const next = [...picked, t];
    setPicked(next);
    if (next.length === target.length) {
      const built = next.map((p) => p.ch).join("");
      setTimeout(() => onResult(built === target, target), 350);
    }
  };

  const undo = () => {
    if (locked) return;
    setPicked((p) => p.slice(0, -1));
  };

  return (
    <Card className="p-6 sm:p-8 text-center">
      {hint}
      <div className="min-h-20 mb-4 flex justify-center items-center gap-2 flex-wrap">
        {picked.length === 0 ? (
          <span className="text-muted-foreground">Нажимай буквы по порядку</span>
        ) : (
          picked.map((p) => (
            <span
              key={p.id}
              className="text-5xl font-extrabold text-primary bg-primary/10 rounded-xl px-3 py-1"
            >
              {p.ch}
            </span>
          ))
        )}
      </div>
      <Button variant="outline" size="sm" className="mb-6" onClick={undo} disabled={locked || picked.length === 0}>
        ← Убрать букву
      </Button>
      <div className="flex justify-center gap-3 flex-wrap">
        {tiles.map((t) => (
          <Button
            key={t.id}
            variant="secondary"
            size="lg"
            disabled={locked || picked.some((p) => p.id === t.id)}
            className={`text-4xl h-20 w-20 font-extrabold ${
              picked.some((p) => p.id === t.id) ? "opacity-30" : ""
            }`}
            onClick={() => tap(t)}
          >
            {t.ch}
          </Button>
        ))}
      </div>
      <Button
        variant="ghost"
        className="mt-6 gap-2"
        onClick={() => speak(target.toLowerCase())}
      >
        <Volume2 className="h-4 w-4" /> Послушать ещё
      </Button>
    </Card>
  );
};

// ===== Уровень 4: выбери картинку к слову =====
const PictureQuiz = ({
  round,
  locked,
  onResult,
}: {
  round: Extract<Round, { kind: "picture" }>;
  locked: boolean;
  onResult: ResultFn;
}) => {
  useEffect(() => {
    speak(round.word.word.toLowerCase());
  }, [round.word.word]);

  return (
    <Card className="p-6 sm:p-8 text-center">
      <p className="text-xl sm:text-2xl text-muted-foreground mb-2">
        Найди картинку к слову
      </p>
      <div className="text-6xl sm:text-7xl font-extrabold text-primary mb-6 tracking-widest">
        {round.word.word}
      </div>
      <Button
        variant="secondary"
        className="mb-6 gap-2"
        onClick={() => speak(round.word.word.toLowerCase())}
      >
        <Volume2 className="h-5 w-5" /> Послушать слово
      </Button>
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
        {round.options.map((o) => (
          <Button
            key={o.word}
            variant="outline"
            disabled={locked}
            className="h-32 text-6xl"
            onClick={() => onResult(o.word === round.word.word, round.word.word)}
          >
            {o.emoji}
          </Button>
        ))}
      </div>
    </Card>
  );
};

export default function ReadingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logCorrectAnswer, logWrongAnswer } = useActivityTracker();
  const { addStars } = useUserProgress();
  const { learned, markLearned } = useReadingProgress();
  const levelItems = (l: Level): string[] =>
    l === 1 ? VOWELS : l === 2 ? SIMPLE_SYLLABLES : l === 3 ? COMPLEX_SYLLABLES : READING_WORDS.map((w) => w.word);

  const [level, setLevel] = useState<Level | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);

  const startLevel = (l: Level) => {
    setLevel(l);
    setRound(makeRound(l));
    setScore(0);
    setAnswered(0);
    setLocked(false);
    setFinished(false);
  };

  const reset = () => {
    setLevel(null);
    setRound(null);
    setFinished(false);
  };

  const handleResult: ResultFn = (ok, correct) => {
    if (locked) return;
    setLocked(true);
    const mode = round?.kind ?? "reading";
    if (ok) {
      setScore((s) => s + 1);
      addStars(1, "reading");
      if (round && level) {
        const item =
          round.kind === "vowel" || round.kind === "syllable" ? round.target : round.word.word;
        markLearned(item, level);
      }
      logCorrectAnswer({ section: "reading", mode });
      speak("Правильно! Молодец!");
      toast({ title: "Правильно! 🎉", description: "+1 ⭐" });
    } else {
      logWrongAnswer({ section: "reading", mode });
      speak("Попробуй ещё раз!");
      toast({
        title: "Попробуй ещё! 💪",
        description: `Правильно: ${correct}`,
        variant: "destructive",
      });
    }
    // Даём похвале/подсказке договорить до конца, прежде чем показать следующее задание
    setTimeout(() => {
      const next = answered + 1;
      setAnswered(next);
      setLocked(false);
      if (level && next >= EXERCISES_PER_SESSION) {
        setFinished(true);
        const stars = score + (ok ? 1 : 0);
        if (stars === EXERCISES_PER_SESSION) {
          addStars(5, "reading");
          speak("Отлично! Все ответы верные! Ты настоящий читатель!");
          toast({ title: "Уровень пройден! 🏆", description: `Все верно! +5 ⭐ бонус` });
        } else {
          speak("Молодец! Урок пройден!");
          toast({
            title: "Уровень пройден! 🎉",
            description: `Верных ответов: ${stars} из ${EXERCISES_PER_SESSION}`,
          });
        }
      } else if (level) {
        setRound(makeRound(level));
      }
    }, ok ? 2800 : 2200);
  };

  const currentLevel = LEVELS.find((l) => l.level === level);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/5 pb-24">
      <div className="blob bg-primary/40 w-72 h-72 -top-16 -left-16" />
      <div className="blob bg-secondary/40 w-80 h-80 top-1/3 -right-24" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
      <StreakBonusBanner />
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => (level ? reset() : navigate("/"))}>
            <ArrowLeft className="w-4 h-4" />
            {level ? "Уровни" : "Назад"}
          </Button>
          {level && !finished && (
            <div className="bg-card rounded-full px-4 py-2 shadow-md font-bold text-primary">
              {answered + 1} / {EXERCISES_PER_SESSION} · Счёт: {score}
            </div>
          )}
        </div>

        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce-gentle">📖</div>
          <h1 className="text-4xl font-extrabold text-gradient mb-2">Чтение</h1>
          {!level && <p className="text-lg text-muted-foreground">Читаем по складам весело!</p>}
        </div>

        {!level && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {LEVELS.map((l, i) => (
              <Card
                key={l.level}
                onClick={() => startLevel(l.level)}
                className={`group relative overflow-hidden p-8 text-center cursor-pointer rounded-3xl border-0 shadow-md card-glow animate-pop-in hover:scale-[1.03] transition-all duration-300 bg-gradient-to-br ${l.bg}`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/5" />
                <div className="relative z-10 text-6xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{l.emoji}</div>
                <h3 className="relative z-10 text-2xl font-extrabold mb-2">{l.title}</h3>
                <p className="relative z-10 text-muted-foreground">Уровень {l.level} · {l.subtitle}</p>
                {(() => {
                  const items = levelItems(l.level);
                  const done = items.filter((x) => learned.has(x));
                  const pct = Math.round((done.length / items.length) * 100);
                  return (
                    <div className="relative z-10 mt-4 space-y-2">
                      <div className="text-sm font-bold">🦊 Пройдено: {done.length} из {items.length}</div>
                      <div className="h-2 rounded-full bg-background/60 overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      {done.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1">
                          {done.slice(0, 12).map((x) => (
                            <span key={x} className="text-xs font-bold bg-card rounded-full px-2 py-0.5">{x}</span>
                          ))}
                          {done.length > 12 && <span className="text-xs">+{done.length - 12}</span>}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Card>
            ))}
          </div>
        )}

        {level && finished && (
          <Card className="p-10 text-center space-y-6">
            <div className="text-7xl">{score === EXERCISES_PER_SESSION ? "🏆" : "🎉"}</div>
            <div className="text-2xl font-bold">
              Уровень «{currentLevel?.title}» пройден!
            </div>
            <p className="text-muted-foreground">
              Верных ответов: {score} из {EXERCISES_PER_SESSION}
            </p>
            <div className="flex justify-center gap-3">
              <Button size="lg" onClick={() => level && startLevel(level)}>
                Играть ещё раз
              </Button>
              <Button size="lg" variant="outline" onClick={reset}>
                Другой уровень
              </Button>
            </div>
          </Card>
        )}

        {level && !finished && round?.kind === "vowel" && (
          <VowelQuiz round={round} locked={locked} onResult={handleResult} />
        )}

        {level && !finished && round?.kind === "syllable" && (
          <Builder
            target={round.target}
            locked={locked}
            onResult={handleResult}
          />
        )}

        {level && !finished && round?.kind === "word" && (
          <Builder
            target={round.word.word}
            hint={
              <div className="mb-4">
                <div className="text-7xl">{round.word.emoji}</div>
                <p className="text-muted-foreground mt-2">Собери слово по картинке</p>
              </div>
            }
            locked={locked}
            onResult={handleResult}
          />
        )}

        {level && !finished && round?.kind === "picture" && (
          <PictureQuiz round={round} locked={locked} onResult={handleResult} />
        )}
      </div>
    </div>
  );
}
