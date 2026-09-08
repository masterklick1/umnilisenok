import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, RotateCcw } from "lucide-react";

interface MissingTask {
  id: number;
  wordPattern: string; // e.g., "A _ P L E"
  correctLetter: string;
  fullWord: string;
  translation: string;
  emoji: string;
  options: string[];
}

const TASKS: MissingTask[] = [
  {
    id: 1,
    wordPattern: "C _ T",
    correctLetter: "A",
    fullWord: "Cat",
    translation: "Кошка",
    emoji: "🐱",
    options: ["A", "O", "U"],
  },
  {
    id: 2,
    wordPattern: "D _ G",
    correctLetter: "O",
    fullWord: "Dog",
    translation: "Собака",
    emoji: "🐶",
    options: ["E", "O", "I"],
  },
  {
    id: 3,
    wordPattern: "S _ N",
    correctLetter: "U",
    fullWord: "Sun",
    translation: "Солнце",
    emoji: "☀️",
    options: ["A", "E", "U"],
  },
  {
    id: 4,
    wordPattern: "F _ S H",
    correctLetter: "I",
    fullWord: "Fish",
    translation: "Рыба",
    emoji: "🐟",
    options: ["I", "O", "E"],
  },
];

export default function EnglishMissingPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const t = TASKS[index];

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSelect = (letter: string) => {
    if (selected !== null) return;
    setSelected(letter);

    if (letter === t.correctLetter) {
      setScore((prev) => prev + 1);
      speak(t.fullWord);
    } else {
      speak(letter);
    }

    setTimeout(() => {
      if (index + 1 < TASKS.length) {
        setIndex((prev) => prev + 1);
        setSelected(null);
      } else {
        setIsFinished(true);
      }
    }, 1200);
  };

  const restart = () => {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setIsFinished(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 pb-20">
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
            <h1 className="text-3xl font-black text-emerald-600">Пропущенная буква</h1>
            <p className="text-sm text-muted-foreground">Какая буква пропала?</p>
          </div>
        </div>

        {!isFinished ? (
          <Card className="p-6 bg-white border-2 border-emerald-200 rounded-3xl text-center shadow-lg space-y-6">
            <div className="flex justify-between items-center text-xs text-emerald-600 font-bold uppercase tracking-wider">
              <span>Задание {index + 1} из {TASKS.length}</span>
              <span>Очки: {score}</span>
            </div>

            <div className="space-y-3">
              <div className="text-7xl">{t.emoji}</div>
              <div className="text-3xl font-black tracking-widest text-slate-800">
                {selected
                  ? t.wordPattern.replace("_", selected)
                  : t.wordPattern}
              </div>
              <p className="text-sm text-slate-500">{t.translation}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {t.options.map((opt) => {
                let btnStyle = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-100";
                if (selected) {
                  if (opt === t.correctLetter) {
                    btnStyle = "bg-emerald-500 text-white border-emerald-600";
                  } else if (opt === selected) {
                    btnStyle = "bg-rose-500 text-white border-rose-600";
                  }
                }

                return (
                  <Button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className={`h-16 text-2xl font-black rounded-2xl border-2 transition-all ${btnStyle}`}
                  >
                    {opt}
                  </Button>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="p-8 bg-white border-2 border-emerald-200 rounded-3xl text-center shadow-lg space-y-6">
            <div className="text-6xl">🌟</div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Замечательно!</h2>
              <p className="text-slate-600 mt-2">
                Ты нашел <span className="font-bold text-emerald-600">{score}</span> из {TASKS.length} правильных букв!
              </p>
            </div>
            <Button
              onClick={restart}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-6 rounded-2xl text-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" /> Играть снова
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
