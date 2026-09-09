import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, Volume2, Star, Lightbulb, Trophy } from "lucide-react";
import { useActivityTracker } from "@/hooks/useActivityTracker";

interface WordTask {
  id: number;
  word: string;
  translation: string;
  emoji: string;
  category: string;
}

const WORDS_DATABASE: WordTask[] = [
  { id: 1, word: "CAT", translation: "Кошка", emoji: "🐱", category: "Животные" },
  { id: 2, word: "DOG", translation: "Собака", emoji: "🐶", category: "Животные" },
  { id: 3, word: "SUN", translation: "Солнце", emoji: "☀️", category: "Природа" },
  { id: 4, word: "FISH", translation: "Рыба", emoji: "🐟", category: "Животные" },
  { id: 5, word: "DUCK", translation: "Утка", emoji: "🦆", category: "Птицы" },
  { id: 6, word: "APPLE", translation: "Яблоко", emoji: "🍎", category: "Еда" },
  { id: 7, word: "TRAIN", translation: "Поезд", emoji: "🚂", category: "Транспорт" },
  { id: 8, word: "BANANA", translation: "Банан", emoji: "🍌", category: "Еда" },
  { id: 9, word: "MONKEY", translation: "Обезьяна", emoji: "🐒", category: "Животные" },
  { id: 10, word: "DOLPHIN", translation: "Дельфин", emoji: "🐬", category: "Животные" },
];

export default function EnglishWordBuilderPage() {
  const navigate = useNavigate();
  const { logCorrectAnswer, logWrongAnswer, logClick } = useActivityTracker();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [availableLetters, setAvailableLetters] = useState<{ id: string; letter: string }[]>([]);
  const [builtLetters, setBuiltLetters] = useState<{ id: string; letter: string }[]>([]);
  const [earnedStars, setEarnedStars] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const currentTask = WORDS_DATABASE[currentIndex];

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const loadWord = (index: number) => {
    const task = WORDS_DATABASE[index];
    const lettersArray = task.word.split("").map((char, idx) => ({
      id: `${char}-${idx}-${Math.random()}`,
      letter: char,
    }));

    const shuffled = [...lettersArray].sort(() => Math.random() - 0.5);

    setAvailableLetters(shuffled);
    setBuiltLetters([]);
    setIsSuccess(false);
    setShowHint(false);
  };

  useEffect(() => {
    loadWord(0);
  }, []);

  const handlePickLetter = (item: { id: string; letter: string }) => {
    if (isSuccess) return;

    logClick(`letter_${item.letter}`);
    speak(item.letter);

    const newAvailable = availableLetters.filter((l) => l.id !== item.id);
    const newBuilt = [...builtLetters, item];

    setAvailableLetters(newAvailable);
    setBuiltLetters(newBuilt);

    const currentBuiltWord = newBuilt.map((l) => l.letter).join("");
    
    // Проверка совпадения слова
    if (currentBuiltWord === currentTask.word) {
      setIsSuccess(true);
      setEarnedStars((prev) => prev + 3);

      // Логируем правильный ответ в общую систему для подсчета звезд
      logCorrectAnswer({
        subject: "english",
        activity: "word_builder",
        word: currentTask.word,
        reward_stars: 3,
      });

      speak(currentTask.word);

      setTimeout(() => {
        if (currentIndex + 1 < WORDS_DATABASE.length) {
          setCurrentIndex((prev) => prev + 1);
          loadWord(currentIndex + 1);
        } else {
          setIsGameFinished(true);
        }
      }, 1500);
    } else if (newBuilt.length === currentTask.word.length && currentBuiltWord !== currentTask.word) {
      // Если слово собрано неверно
      logWrongAnswer({
        subject: "english",
        activity: "word_builder",
        word: currentTask.word,
        userAttempt: currentBuiltWord,
      });
    }
  };

  const handleRemoveLetter = (item: { id: string; letter: string }) => {
    if (isSuccess) return;

    const newBuilt = builtLetters.filter((l) => l.id !== item.id);
    const newAvailable = [...availableLetters, item];

    setBuiltLetters(newBuilt);
    setAvailableLetters(newAvailable);
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setEarnedStars(0);
    setIsGameFinished(false);
    loadWord(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/english")}
              className="rounded-full bg-white shadow-sm"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-amber-600">Собери слово</h1>
              <p className="text-xs text-muted-foreground">Уровень {currentIndex + 1} из {WORDS_DATABASE.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm font-black text-amber-500 border border-amber-200">
            <Star className="w-4 h-4 fill-amber-400" /> +{earnedStars}
          </div>
        </div>

        {!isGameFinished ? (
          <Card className="p-6 bg-white border-2 border-amber-200 rounded-3xl text-center shadow-lg space-y-6">
            <div className="space-y-2">
              <div className="text-8xl animate-bounce">{currentTask.emoji}</div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-bold text-slate-700">{currentTask.translation}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => speak(currentTask.word)}
                  className="rounded-full h-8 w-8 text-amber-500 bg-amber-50"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
              </div>
              <span className="inline-block text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold">
                {currentTask.category}
              </span>
            </div>

            <div className="flex justify-center gap-2 flex-wrap min-h-[64px] items-center p-3 bg-amber-50/50 rounded-2xl border-2 border-dashed border-amber-200">
              {builtLetters.length === 0 && !isSuccess && (
                <p className="text-xs text-amber-400 font-semibold">Нажимай на буквы внизу 👇</p>
              )}
              {builtLetters.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleRemoveLetter(item)}
                  className={`w-12 h-14 text-2xl font-black rounded-xl border-b-4 transition-all ${
                    isSuccess
                      ? "bg-emerald-500 border-emerald-700 text-white animate-pulse"
                      : "bg-amber-400 border-amber-600 text-white hover:bg-amber-500"
                  }`}
                >
                  {item.letter}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex justify-center gap-2 flex-wrap">
                {availableLetters.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handlePickLetter(item)}
                    className="w-12 h-14 bg-white border-2 border-amber-300 border-b-4 border-b-amber-400 text-slate-800 text-2xl font-black rounded-xl hover:bg-amber-100 transition-all active:translate-y-1"
                  >
                    {item.letter}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logClick("hint_toggle");
                    setShowHint(!showHint);
                  }}
                  className="text-xs text-amber-600 gap-1"
                >
                  <Lightbulb className="w-4 h-4" />
                  {showHint ? `Подсказка: ${currentTask.word}` : "Нужна подсказка?"}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-8 bg-white border-2 border-amber-200 rounded-3xl text-center shadow-lg space-y-6">
            <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto text-4xl">
              <Trophy className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Ты просто супер! 🎉</h2>
              <p className="text-slate-600 mt-2">
                Ты собрал все <span className="font-bold text-amber-600">{WORDS_DATABASE.length}</span> слов и заработал{" "}
                <span className="font-bold text-amber-500">{earnedStars} ⭐</span>!
              </p>
            </div>
            <Button
              onClick={restartGame}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-6 rounded-2xl text-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" /> Пройти ещё раз
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
