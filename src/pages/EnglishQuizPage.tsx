import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

interface Question {
  id: number;
  word: string;
  translation: string;
  emoji: string;
  options: string[];
  correct: string;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    word: "Apple",
    translation: "Яблоко",
    emoji: "🍎",
    options: ["A", "B", "C", "D"],
    correct: "A",
  },
  {
    id: 2,
    word: "Dog",
    translation: "Собака",
    emoji: "🐶",
    options: ["C", "D", "E", "F"],
    correct: "D",
  },
  {
    id: 3,
    word: "Cat",
    translation: "Кошка",
    emoji: "🐱",
    options: ["A", "B", "C", "M"],
    correct: "C",
  },
  {
    id: 4,
    word: "Sun",
    translation: "Солнце",
    emoji: "☀️",
    options: ["S", "T", "U", "V"],
    correct: "S",
  },
];

export default function EnglishQuizPage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const q = QUESTIONS[currentIndex];

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleOptionClick = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    speak(option);

    if (option === q.correct) {
      setScore((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentIndex + 1 < QUESTIONS.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelected(null);
      } else {
        setIsFinished(true);
      }
    }, 1200);
  };

  const restart = () => {
    setCurrentIndex(0);
    setSelected(null);
    setScore(0);
    setIsFinished(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 p-4 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        {/* Шапка */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/english")}
            className="rounded-full bg-white shadow-sm"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-cyan-600">Викторина</h1>
            <p className="text-sm text-muted-foreground">Найди правильную букву!</p>
          </div>
        </div>

        {!isFinished ? (
          <Card className="p-6 bg-white border-2 border-cyan-200 rounded-3xl text-center shadow-lg space-y-6">
            <div className="flex justify-between items-center text-xs text-cyan-600 font-bold uppercase tracking-wider">
              <span>Вопрос {currentIndex + 1} из {QUESTIONS.length}</span>
              <span>Очки: {score}</span>
            </div>

            <div className="space-y-2">
              <div className="text-7xl">{q.emoji}</div>
              <h2 className="text-2xl font-black text-slate-800">{q.word}</h2>
              <p className="text-sm text-slate-500">{q.translation}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {q.options.map((opt) => {
                let btnStyle = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-cyan-100";
                if (selected) {
                  if (opt === q.correct) {
                    btnStyle = "bg-emerald-500 text-white border-emerald-600";
                  } else if (opt === selected) {
                    btnStyle = "bg-rose-500 text-white border-rose-600";
                  }
                }

                return (
                  <Button
                    key={opt}
                    onClick={() => handleOptionClick(opt)}
                    className={`h-16 text-2xl font-black rounded-2xl border-2 transition-all ${btnStyle}`}
                  >
                    {opt}
                  </Button>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="p-8 bg-white border-2 border-cyan-200 rounded-3xl text-center shadow-lg space-y-6">
            <div className="text-6xl">🎉</div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Отличная работа!</h2>
              <p className="text-slate-600 mt-2">
                Ты ответил правильно на <span className="font-bold text-cyan-600">{score}</span> из {QUESTIONS.length} вопросов!
              </p>
            </div>
            <Button
              onClick={restart}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-6 rounded-2xl text-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" /> Играть снова
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
