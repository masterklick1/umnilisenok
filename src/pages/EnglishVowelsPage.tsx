import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2, Sparkles } from "lucide-react";

interface LetterCard {
  letter: string;
  example: string;
  translation: string;
  emoji: string;
}

const VOWELS: LetterCard[] = [
  { letter: "A", example: "Apple", translation: "Яблоко", emoji: "🍎" },
  { letter: "E", example: "Elephant", translation: "Слон", emoji: "🐘" },
  { letter: "I", example: "Ice Cream", translation: "Мороженое", emoji: "🍦" },
  { letter: "O", example: "Orange", translation: "Апельсин", emoji: "🍊" },
  { letter: "U", example: "Umbrella", translation: "Зонт", emoji: "☂️" },
];

const CONSONANTS: LetterCard[] = [
  { letter: "B", example: "Ball", translation: "Мяч", emoji: "⚽" },
  { letter: "C", example: "Cat", translation: "Кошка", emoji: "🐱" },
  { letter: "D", example: "Dog", translation: "Собака", emoji: "🐶" },
  { letter: "F", example: "Fish", translation: "Рыба", emoji: "🐟" },
  { letter: "G", example: "Giraffe", translation: "Жираф", emoji: "🦒" },
  { letter: "H", example: "House", translation: "Дом", emoji: "🏠" },
];

export default function EnglishVowelsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"vowels" | "consonants">("vowels");

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const list = tab === "vowels" ? VOWELS : CONSONANTS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
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
            <h1 className="text-3xl font-black text-indigo-600">Буквы и Звуки</h1>
            <p className="text-sm text-muted-foreground">Гласные и согласные буквы</p>
          </div>
        </div>

        {/* Табы */}
        <div className="grid grid-cols-2 gap-2 bg-white/80 p-1.5 rounded-2xl shadow-sm border border-indigo-100">
          <Button
            onClick={() => setTab("vowels")}
            className={`rounded-xl font-bold transition-all ${
              tab === "vowels"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-transparent text-slate-600 hover:bg-indigo-50"
            }`}
          >
            Гласные (Vowels)
          </Button>
          <Button
            onClick={() => setTab("consonants")}
            className={`rounded-xl font-bold transition-all ${
              tab === "consonants"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-transparent text-slate-600 hover:bg-purple-50"
            }`}
          >
            Согласные (Consonants)
          </Button>
        </div>

        {/* Карточки */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((item) => (
            <Card
              key={item.letter}
              onClick={() => speak(`${item.letter}. ${item.example}`)}
              className="p-5 bg-white border-2 border-indigo-100 rounded-3xl cursor-pointer hover:scale-[1.02] transition-all shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 font-black text-3xl flex items-center justify-center shadow-inner">
                  {item.letter}
                </div>
                <div>
                  <div className="text-2xl">{item.emoji}</div>
                  <div className="font-bold text-slate-800 text-lg">{item.example}</div>
                  <div className="text-xs text-slate-500">{item.translation}</div>
                </div>
              </div>
              <div className="text-indigo-500 p-2 bg-indigo-50 rounded-full">
                <Volume2 className="w-5 h-5" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
