import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";

type Letter = {
  letter: string;
  sound: string;
  word: string;
  emoji: string;
};

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

const speak = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
};

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

export default function AlphabetPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"learn" | "quiz" | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<Letter[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [showResult, setShowResult] = useState<boolean | null>(null);

  const startLearning = () => {
    setMode("learn");
    setCurrentIndex(0);
  };

  const startQuiz = () => {
    setMode("quiz");
    setCurrentIndex(0);
    setScore(0);
    setTotal(0);
    setShowResult(null);
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
      speak("Правильно! Молодец!");
      toast({
        title: "Правильно! 🎉",
        description: "Отличная работа!",
      });
    } else {
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            Алфавит
          </h1>
          <p className="text-lg text-muted-foreground">
            Учим буквы весело!
          </p>
        </div>

        {!mode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card 
              className="p-8 text-center hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20"
              onClick={startLearning}
            >
              <div className="text-5xl mb-4">📖</div>
              <h3 className="text-2xl font-bold mb-2">Учить буквы</h3>
              <p className="text-muted-foreground">Познакомься со всеми буквами алфавита</p>
            </Card>

            <Card 
              className="p-8 text-center hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-secondary/10 to-secondary/5 border-2 border-secondary/20"
              onClick={startQuiz}
            >
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold mb-2">Викторина</h3>
              <p className="text-muted-foreground">Проверь свои знания букв</p>
            </Card>
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
