import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useUserProgress } from "@/hooks/useUserProgress";
import { speak } from "@/lib/sound";

type Letter = {
  letter: string;
  sound: string;
  word: string;
  emoji: string;
};

type Mode = "learn" | "quiz" | "syllables" | "vowels" | "missing" | null;

const russianAlphabet: Letter[] = [
  { letter: "А", sound: "а", word: "Арбуз", emoji: "🍉" },
  { letter: "Б", sound: "бэ", word: "Белка", emoji: "🐿️" },
  { letter: "В", sound: "вэ", word: "Волк", emoji: "🐺" },
  { letter: "Г", sound: "гэ", word: "Гриб", emoji: "🍄" },
  { letter: "Д", sound: "дэ", word: "Дом", emoji: "🏠" },
  { letter: "Е", sound: "е", word: "Ель", emoji: "🌲" },
  { letter: "Ё", sound: "ё", word: "Ёжик", emoji: "🦔" },
  { letter: "Ж", sound: "жэ", word: "Жираф", emoji: "🦒" },
  { letter: "З", sound: "зэ", word: "Заяц", emoji: "🐰" },
  { letter: "И", sound: "и", word: "Игрушка", emoji: "🧸" },
  { letter: "Й", sound: "и краткое", word: "Йогурт", emoji: "🥛" },
  { letter: "К", sound: "ка", word: "Кот", emoji: "🐱" },
  { letter: "Л", sound: "эль", word: "Лиса", emoji: "🦊" },
  { letter: "М", sound: "эм", word: "Медведь", emoji: "🐻" },
  { letter: "Н", sound: "эн", word: "Носорог", emoji: "🦏" },
  { letter: "О", sound: "о", word: "Облако", emoji: "☁️" },
  { letter: "П", sound: "пэ", word: "Пингвин", emoji: "🐧" },
  { letter: "Р", sound: "эр", word: "Рыба", emoji: "🐟" },
  { letter: "С", sound: "эс", word: "Слон", emoji: "🐘" },
  { letter: "Т", sound: "тэ", word: "Тигр", emoji: "🐯" },
  { letter: "У", sound: "у", word: "Утка", emoji: "🦆" },
  { letter: "Ф", sound: "эф", word: "Фламинго", emoji: "🦩" },
  { letter: "Х", sound: "ха", word: "Хомяк", emoji: "🐹" },
  { letter: "Ц", sound: "цэ", word: "Цветок", emoji: "🌸" },
  { letter: "Ч", sound: "че", word: "Черепаха", emoji: "🐢" },
  { letter: "Ш", sound: "ша", word: "Шарик", emoji: "🎈" },
  { letter: "Щ", sound: "ща", word: "Щенок", emoji: "🐶" },
  { letter: "Ъ", sound: "твёрдый знак", word: "Объект", emoji: "📦" },
  { letter: "Ы", sound: "ы", word: "Сыр", emoji: "🧀" },
  { letter: "Ь", sound: "мягкий знак", word: "Лось", emoji: "🦌" },
  { letter: "Э", sound: "э", word: "Экскаватор", emoji: "🚜" },
  { letter: "Ю", sound: "ю", word: "Юла", emoji: "🌀" },
  { letter: "Я", sound: "я", word: "Яблоко", emoji: "🍎" },
];

const VOWELS = ["А", "Е", "Ё", "И", "О", "У", "Ы", "Э", "Ю", "Я"];
const SYLLABLE_CONSONANTS = ["Б", "В", "Г", "Д", "Ж", "З", "К", "Л", "М", "Н", "П", "Р", "С", "Т", "Ф", "Х"];
const SYLLABLE_VOWELS = ["А", "О", "У", "Ы", "И", "Э"];

const generateQuizOptions = (correctLetter: Letter): Letter[] => {
  const options = [correctLetter];
  const availableLetters = russianAlphabet.filter(l => l.letter !== correctLetter.letter);
  
  while (options.length < 4) {
    const randomLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
    if (!options.includes(randomLetter)) {
      options.push(randomLetter);
    }
  }
  
  return options.sort(() => Math.random() - 0.5);
};

type ResultFn = (ok: boolean, correct?: string) => void;

// ===== Слоги (чтение слогов) =====
const SyllablesMode = ({ onExit }: { onExit: () => void }) => {
  const randomSyllable = () => {
    const c = SYLLABLE_CONSONANTS[Math.floor(Math.random() * SYLLABLE_CONSONANTS.length)];
    const v = SYLLABLE_VOWELS[Math.floor(Math.random() * SYLLABLE_VOWELS.length)];
    return c + v.toLowerCase();
  };
  const [syllable, setSyllable] = useState(() => randomSyllable());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">Читаем слоги ✏️</div>
        <Button variant="outline" onClick={onExit}>Выбрать режим</Button>
      </div>
      <Card className="p-12 text-center">
        <div className="text-8xl font-extrabold text-primary mb-8">{syllable}</div>
        <Button size="lg" variant="secondary" className="mb-8" onClick={() => speak(syllable)}>
          <Volume2 className="mr-2 h-5 w-5" /> Послушать слог
        </Button>
        <p className="text-muted-foreground">Прочитай слог вслух, а потом проверь себя кнопкой</p>
      </Card>
      <div className="flex justify-center">
        <Button size="lg" onClick={() => { const s = randomSyllable(); setSyllable(s); speak(s); }}>
          Следующий слог →
        </Button>
      </div>
    </div>
  );
};

// ===== Гласная или согласная =====
const VowelsMode = ({ onResult, onExit }: { onResult: ResultFn; onExit: () => void }) => {
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [round, setRound] = useState(0);
  const [locked, setLocked] = useState<"vowel" | "consonant" | null>(null);

  const data = useMemo(() => {
    const pool = russianAlphabet.filter((l) => l.letter !== "Ъ" && l.letter !== "Ь");
    const l = pool[Math.floor(Math.random() * pool.length)];
    return { letter: l.letter, isVowel: VOWELS.includes(l.letter) };
  }, [round]);

  const pick = (choice: "vowel" | "consonant") => {
    if (locked) return;
    setLocked(choice);
    const ok = (choice === "vowel") === data.isVowel;
    setTotal((t) => t + 1);
    if (ok) setScore((s) => s + 1);
    onResult(ok, data.isVowel ? "гласная" : "согласная");
    setTimeout(() => { setLocked(null); setRound((r) => r + 1); }, 1300);
  };

  const btnClass = (choice: "vowel" | "consonant") =>
    locked
      ? (choice === "vowel") === data.isVowel
        ? "bg-green-500 hover:bg-green-600"
        : locked === choice
          ? "bg-red-500 hover:bg-red-600"
          : ""
      : "";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg shadow">
        <div className="text-lg font-semibold">Счёт: {score} / {total}</div>
        <Button variant="outline" onClick={onExit}>Выбрать режим</Button>
      </div>
      <Card className="p-8 text-center">
        <p className="text-2xl text-muted-foreground mb-4">Это гласная или согласная?</p>
        <div className="text-8xl font-extrabold text-primary mb-8">{data.letter}</div>
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <Button size="lg" disabled={locked !== null} className={`h-20 text-xl ${btnClass("vowel")}`} onClick={() => pick("vowel")}>
            Гласная
          </Button>
          <Button size="lg" disabled={locked !== null} className={`h-20 text-xl ${btnClass("consonant")}`} onClick={() => pick("consonant")}>
            Согласная
          </Button>
        </div>
      </Card>
    </div>
  );
};

// ===== Пропущенная буква =====
const MissingMode = ({ onResult, onExit }: { onResult: ResultFn; onExit: () => void }) => {
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [round, setRound] = useState(0);
  const [locked, setLocked] = useState<string | null>(null);

  const data = useMemo(() => {
    const i = Math.floor(Math.random() * (russianAlphabet.length - 2));
    const a = russianAlphabet[i].letter;
    const mid = russianAlphabet[i + 1].letter;
    const c = russianAlphabet[i + 2].letter;
    const opts = new Set<string>([mid]);
    while (opts.size < 3) {
      opts.add(russianAlphabet[Math.floor(Math.random() * russianAlphabet.length)].letter);
    }
    return { a, mid, c, opts: [...opts].sort(() => Math.random() - 0.5) };
  }, [round]);

  const pick = (letter: string) => {
    if (locked) return;
    setLocked(letter);
    const ok = letter === data.mid;
    setTotal((t) => t + 1);
    if (ok) setScore((s) => s + 1);
    onResult(ok, data.mid);
    setTimeout(() => { setLocked(null); setRound((r) => r + 1); }, 1300);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg shadow">
        <div className="text-lg font-semibold">Счёт: {score} / {total}</div>
        <Button variant="outline" onClick={onExit}>Выбрать режим</Button>
      </div>
      <Card className="p-8 text-center">
        <p className="text-2xl text-muted-foreground mb-6">Какая буква пропала?</p>
        <div className="flex justify-center items-center gap-3 mb-8">
          <span className="text-7xl font-extrabold text-primary">{data.a}</span>
          <span className="text-7xl font-extrabold text-accent bg-accent/10 rounded-2xl px-4 animate-pulse-soft">?</span>
          <span className="text-7xl font-extrabold text-primary">{data.c}</span>
        </div>
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          {data.opts.map((o) => (
            <Button
              key={o}
              size="lg"
              disabled={locked !== null}
              className={`text-4xl h-24 ${locked && o === data.mid ? "bg-green-500 hover:bg-green-600" : locked === o ? "bg-red-500 hover:bg-red-600" : ""}`}
              onClick={() => pick(o)}
            >
              {o}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default function AlphabetPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logCorrectAnswer, logWrongAnswer, logActivity } = useActivityTracker();
  const { addStars } = useUserProgress();
  const [mode, setMode] = useState<Mode>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<Letter[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [showResult, setShowResult] = useState<boolean | null>(null);

  const handleResult = (modeName: string): ResultFn => (ok, correct) => {
    if (ok) {
      addStars(1, "alphabet");
      logCorrectAnswer({ section: "alphabet", mode: modeName });
      speak("Правильно! Молодец!");
      toast({ title: "Правильно! 🎉", description: "+1 ⭐" });
    } else {
      logWrongAnswer({ section: "alphabet", mode: modeName });
      speak("Попробуй ещё раз!");
      toast({ title: "Попробуй ещё! 💪", description: correct ? `Правильно: ${correct}` : "Попробуй ещё", variant: "destructive" });
    }
  };

  const startLearning = () => {
    setMode("learn");
    setCurrentIndex(0);
    logActivity("start_learning", { section: "alphabet", mode: "learn" });
  };

  const startQuiz = () => {
    setMode("quiz");
    setCurrentIndex(0);
    setScore(0);
    setTotal(0);
    setShowResult(null);
    logActivity("start_learning", { section: "alphabet", mode: "quiz" });
    generateNewQuestion();
  };

  const generateNewQuestion = () => {
    const randomIndex = Math.floor(Math.random() * russianAlphabet.length);
    setCurrentIndex(randomIndex);
    setQuizOptions(generateQuizOptions(russianAlphabet[randomIndex]));
  };

  const nextLetter = () => {
    if (currentIndex < russianAlphabet.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const prevLetter = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(russianAlphabet.length - 1);
    }
  };

  const checkAnswer = (selected: Letter) => {
    const correct = selected.letter === russianAlphabet[currentIndex].letter;
    setShowResult(correct);
    setTotal(total + 1);
    
    if (correct) {
      setScore(score + 1);
      addStars(1, "alphabet");
      logCorrectAnswer({ section: "alphabet", letter: russianAlphabet[currentIndex].letter });
      speak("Правильно! Молодец!");
      toast({
        title: "Правильно! 🎉",
        description: "Отличная работа! +1 ⭐",
      });
    } else {
      logWrongAnswer({ section: "alphabet", letter: russianAlphabet[currentIndex].letter, selected: selected.letter });
      speak("Не правильно. Ещё раз подумай!");
      toast({
        title: "Попробуй ещё раз! 💪",
        description: `Правильный ответ: ${russianAlphabet[currentIndex].letter}`,
        variant: "destructive",
      });
    }

    setTimeout(() => {
      setShowResult(null);
      generateNewQuestion();
    }, 2000);
  };

  const currentLetter = russianAlphabet[currentIndex];

  const resetMode = () => {
    setMode(null);
    setCurrentIndex(0);
    setScore(0);
    setTotal(0);
    setShowResult(null);
  };

  const menuItems = [
    { m: "learn" as Mode, emoji: "📖", title: "Учить буквы", desc: "Все буквы алфавита", grad: "from-rose-100 to-orange-100", onClick: startLearning },
    { m: "syllables" as Mode, emoji: "✏️", title: "Слоги", desc: "Учимся читать слоги", grad: "from-amber-100 to-yellow-100", onClick: () => setMode("syllables") },
    { m: "quiz" as Mode, emoji: "🎯", title: "Викторина", desc: "Найди букву для слова", grad: "from-sky-100 to-cyan-100", onClick: startQuiz },
    { m: "vowels" as Mode, emoji: "🔵", title: "Гласная или согласная", desc: "Определи букву", grad: "from-violet-100 to-purple-100", onClick: () => setMode("vowels") },
    { m: "missing" as Mode, emoji: "❓", title: "Пропущенная буква", desc: "Какая буква пропала?", grad: "from-emerald-100 to-teal-100", onClick: () => setMode("missing") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5 p-4">
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
          <div className="text-6xl mb-4 animate-bounce-gentle">📚</div>
          <h1 className="text-4xl font-extrabold text-gradient mb-2">
            Алфавит
          </h1>
          <p className="text-lg text-muted-foreground">
            Учим буквы весело!
          </p>
        </div>

        {!mode && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {menuItems.map((it, i) => (
              <Card
                key={it.title}
                className={`group relative overflow-hidden p-8 text-center cursor-pointer rounded-3xl border-0 shadow-md card-glow animate-pop-in hover:scale-[1.03] transition-all duration-300 bg-gradient-to-br ${it.grad}`}
                style={{ animationDelay: `${i * 70}ms` }}
                onClick={it.onClick}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/5" />
                <div className="relative z-10 text-6xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{it.emoji}</div>
                <h3 className="relative z-10 text-2xl font-extrabold mb-2">{it.title}</h3>
                <p className="relative z-10 text-muted-foreground">{it.desc}</p>
              </Card>
            ))}
          </div>
        )}

        {mode === "learn" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold">
                Буква {currentIndex + 1} из {russianAlphabet.length}
              </div>
              <Button variant="outline" onClick={resetMode}>
                Выбрать режим
              </Button>
            </div>

            <Card className="p-12 text-center">
              <div className="text-8xl mb-6 font-bold text-primary">
                {currentLetter.letter}
              </div>
              
              <Button
                size="lg"
                variant="secondary"
                onClick={() => speak(`Буква ${currentLetter.letter}. ${currentLetter.sound}. ${currentLetter.word}`)}
                className="mb-8"
              >
                <Volume2 className="mr-2 h-5 w-5" />
                Послушать букву
              </Button>

              <div className="text-4xl mb-4">{currentLetter.emoji}</div>
              <div className="text-2xl font-semibold mb-2">{currentLetter.word}</div>
              <div className="text-xl text-muted-foreground">
                начинается с буквы <span className="font-bold text-primary">{currentLetter.letter}</span>
              </div>
            </Card>

            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={prevLetter} variant="outline">
                ← Предыдущая
              </Button>
              <Button size="lg" onClick={nextLetter}>
                Следующая →
              </Button>
            </div>
          </div>
        )}

        {mode === "syllables" && <SyllablesMode onExit={resetMode} />}
        {mode === "vowels" && <VowelsMode onResult={handleResult("vowels")} onExit={resetMode} />}
        {mode === "missing" && <MissingMode onResult={handleResult("missing")} onExit={resetMode} />}

        {mode === "quiz" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg shadow">
              <div className="text-lg font-semibold">
                Счёт: {score} / {total}
              </div>
              <Button variant="outline" onClick={resetMode}>
                Выбрать режим
              </Button>
            </div>

            <Card className="p-8 text-center">
              <div className="text-3xl mb-6 text-muted-foreground">
                Найди букву для слова:
              </div>
              
              <div className="text-6xl mb-4">{currentLetter.emoji}</div>
              <div className="text-4xl font-bold mb-8 text-foreground">
                {currentLetter.word}
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {quizOptions.map((option) => (
                  <Button
                    key={option.letter}
                    size="lg"
                    onClick={() => checkAnswer(option)}
                    disabled={showResult !== null}
                    className={`text-4xl h-24 transition-all ${
                      showResult !== null && option.letter === currentLetter.letter
                        ? "bg-green-500 hover:bg-green-600"
                        : ""
                    }`}
                  >
                    {option.letter}
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
