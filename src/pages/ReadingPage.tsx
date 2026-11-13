import { StreakBonusBanner } from "@/components/StreakBonusBanner";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { speak } from "@/lib/sound";
import {
  VOWELS,
  READING_WORDS,
  shuffleLetters,
  pickPictureOptions,
  pickLetterOptions,
  type ReadingWord,
} from "@/lib/reading-curriculum";

import { READING_LEVEL_TITLES, readingItemsForLevel } from "@/lib/reading-items";
import {
  loadReadingSession,
  saveReadingSession,
  startReadingSession,
  READING_LESSON_LENGTH,
  type ReadingLevel as Level,
  type ReadingSession,
} from "@/lib/reading-session";

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

const makeRound = (level: Level, item: string, index: number): Round => {
  if (level === 1) return { kind: "vowel", target: item, options: pickLetterOptions(item, VOWELS) };
  if (level < 4) return { kind: "syllable", target: item };
  const word = READING_WORDS.find((entry) => entry.word === item)!;
  return index % 2 === 0
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
      if (built !== target) setPicked([]);
      onResult(built === target, target);
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
            aria-label={t.ch}
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
  const progress = useReadingProgress();
  if (progress.roleLoading) return <p className="p-6 text-center">Загружаем занятие…</p>;
  return <ReadingLesson key={progress.childId ?? "guest"} {...progress} />;
}

function ReadingLesson({ childId, learned, markLearned }: ReturnType<typeof useReadingProgress>) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { logCorrectAnswer, logWrongAnswer } = useActivityTracker();
  const { addStars } = useUserProgress();
  const [saved, setSaved] = useState(() => loadReadingSession(childId));
  const currentSession = useRef(saved);
  const rewards = useRef(Promise.resolve());
  const [showLesson, setShowLesson] = useState(() => searchParams.has("continue") && saved !== null);

  const session = showLesson ? saved : null;
  const level = session?.level;
  const item = session?.items[session.index];
  const index = session?.index ?? 0;
  const round = useMemo(() => level && item ? makeRound(level, item, index) : null, [level, item, index]);
  const finished = !!session && !round;
  const locked = session?.feedback === "correct" || session?.feedback === "incorrect";

  const updateSession = (next: ReadingSession) => {
    currentSession.current = next;
    setSaved(next);
    saveReadingSession(childId, next);
  };

  const startLevel = (nextLevel: Level, repeatItems?: string[]) => {
    updateSession(startReadingSession(nextLevel, learned, repeatItems));
    setShowLesson(true);
  };

  const reward = (amount: number) => {
    if (childId !== user?.id) return;
    rewards.current = rewards.current.then(() => addStars(amount, "reading"));
  };

  const handleResult: ResultFn = (ok, correct) => {
    if (!session || session !== currentSession.current || !round || locked) return;
    const details = { section: "reading", mode: round.kind, item: correct };

    if (ok) {
      updateSession({ ...session, score: session.score + 1, feedback: "correct" });
      reward(1);
      void markLearned(correct, session.level);
      void logCorrectAnswer(details);
      void speak("Правильно! Молодец!");
      return;
    }

    const feedback = session.feedback === "retry" ? "incorrect" : "retry";
    updateSession({
      ...session,
      mistakes: [...new Set([...session.mistakes, correct])],
      feedback,
    });
    void logWrongAnswer(details);
    void speak(feedback === "retry" ? "Попробуй ещё раз!" : `Правильный ответ: ${correct}`);
  };

  const advance = () => {
    if (!session || session !== currentSession.current || !locked) return;
    const next = { ...session, index: session.index + 1, feedback: null };
    updateSession(next);
    if (next.index !== next.items.length) return;
    if (childId === user?.id && next.score === READING_LESSON_LENGTH && next.mistakes.length === 0) {
      reward(5);
      toast({ title: "Все ответы с первой попытки! 🏆", description: "+5 ⭐ бонус" });
    }
    void speak("Молодец! Урок пройден!");
  };

  const nextLevel = session && LEVELS.find(({ level: candidate }) => candidate > session.level &&
    readingItemsForLevel(candidate).some((entry) => !learned.has(entry)))?.level;
  const hasMoreInLevel = session && readingItemsForLevel(session.level)
    .some((entry) => !learned.has(entry) && !session.items.includes(entry));
  const nextLessonLevel = hasMoreInLevel ? session.level : nextLevel;
  const listenLabel = round?.kind === "picture" ? "Послушать слово" : "Послушать ещё";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/5 pb-24">
      <div className="blob bg-primary/40 w-72 h-72 -top-16 -left-16" />
      <div className="blob bg-secondary/40 w-80 h-80 top-1/3 -right-24" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
      <StreakBonusBanner />
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => (session ? setShowLesson(false) : navigate("/"))}>
            <ArrowLeft className="w-4 h-4" />
            {session ? "Уровни" : "Назад"}
          </Button>
          {session && !finished && (
            <div className="bg-card rounded-full px-4 py-2 shadow-md font-bold text-primary">
              {session.index + 1} / {session.items.length} · Счёт: {session.score}
            </div>
          )}
        </div>

        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce-gentle">📖</div>
          <h1 className="text-4xl font-extrabold text-gradient mb-2">Чтение</h1>
          {!level && <p className="text-lg text-muted-foreground">Читаем по складам весело!</p>}
        </div>

        {!session && saved && saved.index < saved.items.length && (
          <Button className="mb-6 w-full" size="lg" onClick={() => setShowLesson(true)}>
            Продолжить занятие · {READING_LEVEL_TITLES[saved.level]}
          </Button>
        )}

        {!session && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {LEVELS.map((l, i) => (
              <button
                key={l.level}
                type="button"
                onClick={() => startLevel(l.level)}
                className={`group relative overflow-hidden p-8 text-center cursor-pointer rounded-3xl border-0 shadow-md card-glow animate-pop-in hover:scale-[1.03] transition-all duration-300 bg-gradient-to-br ${l.bg}`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/5" />
                <div className="relative z-10 text-6xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{l.emoji}</div>
                <h3 className="relative z-10 text-2xl font-extrabold mb-2">{l.title}</h3>
                <p className="relative z-10 text-muted-foreground">Уровень {l.level} · {l.subtitle}</p>
                {(() => {
                  const items = [...new Set(readingItemsForLevel(l.level))];
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
              </button>
            ))}
          </div>
        )}

        {session && finished && (
          <Card className="p-6 sm:p-10 text-center space-y-6">
            <div className="text-7xl">{session.score === session.items.length ? "🏆" : "🎉"}</div>
            <div className="text-2xl font-bold">Занятие завершено!</div>
            <p className="text-muted-foreground">Верных ответов: {session.score} из {session.items.length}</p>
            <div className="flex flex-wrap justify-center gap-3">
              {session.mistakes.length > 0 && (
                <Button size="lg" onClick={() => startLevel(session.level, session.mistakes)}>
                  Повторить сложное
                </Button>
              )}
              {nextLessonLevel ? (
                <Button size="lg" onClick={() => startLevel(nextLessonLevel)}>
                  Следующий урок
                </Button>
              ) : (
                <Button size="lg" onClick={() => startLevel(session.level)}>Играть ещё раз</Button>
              )}
              <Button size="lg" variant="outline" onClick={() => setShowLesson(false)}>Другой уровень</Button>
            </div>
          </Card>
        )}

        {level && !finished && round?.kind === "vowel" && (
          <VowelQuiz key={index} round={round} locked={locked} onResult={handleResult} />
        )}

        {level && !finished && round?.kind === "syllable" && (
          <Builder
            key={index}
            target={round.target}
            locked={locked}
            onResult={handleResult}
          />
        )}

        {level && !finished && round?.kind === "word" && (
          <Builder
            key={index}
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
          <PictureQuiz key={index} round={round} locked={locked} onResult={handleResult} />
        )}

        {session?.feedback && item && (
          <div className="mt-4 space-y-3 text-center">
            <p role="status" className="font-semibold">
              {session.feedback === "retry" && `Попробуй ещё раз. Нажми «${listenLabel}», если нужна подсказка.`}
              {session.feedback === "correct" && "Правильно! Молодец!"}
              {session.feedback === "incorrect" && `Правильный ответ: ${item}`}
            </p>
            {locked && (
              <Button size="lg" onClick={advance}>
                {session.index + 1 === session.items.length ? "Посмотреть результат" : "Дальше"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
