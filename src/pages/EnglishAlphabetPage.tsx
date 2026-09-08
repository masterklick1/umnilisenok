import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2 } from "lucide-react";

interface LetterItem {
  letter: string;
  word: string;
  translation: string;
  emoji: string;
}

const ALPHABET: LetterItem[] = [
  { letter: "A", word: "Apple", translation: "Яблоко", emoji: "🍎" },
  { letter: "B", word: "Ball", translation: "Мяч", emoji: "⚽" },
  { letter: "C", word: "Cat", translation: "Кошка", emoji: "🐱" },
  { letter: "D", word: "Dog", translation: "Собака", emoji: "🐶" },
  { letter: "E", word: "Elephant", translation: "Слон", emoji: "🐘" },
  { letter: "F", word: "Fish", translation: "Рыба", emoji: "🐟" },
  { letter: "G", word: "Giraffe", translation: "Жираф", emoji: "🦒" },
  { letter: "H", word: "House", translation: "Дом", emoji: "🏠" },
  { letter: "I", word: "Ice cream", translation: "Мороженое", emoji: "🍦" },
  { letter: "J", word: "Juice", translation: "Сок", emoji: "🧃" },
  { letter: "K", word: "Kite", translation: "Воздушный змей", emoji: "🪁" },
  { letter: "L", word: "Lion", translation: "Лев", emoji: "🦁" },
  { letter: "M", word: "Monkey", translation: "Обезьяна", emoji: "🐒" },
  { letter: "N", word: "Nest", translation: "Гнездо", emoji: "🪹" },
  { letter: "O", word: "Orange", translation: "Апельсин", emoji: "🍊" },
  { letter: "P", word: "Pencil", translation: "Карандаш", emoji: "✏️" },
  { letter: "Q", word: "Queen", translation: "Королева", emoji: "👑" },
  { letter: "R", word: "Robot", translation: "Робот", emoji: "🤖" },
  { letter: "S", word: "Sun", translation: "Солнце", emoji: "☀️" },
  { letter: "T", word: "Tree", translation: "Дерево", emoji: "🌳" },
  { letter: "U", word: "Umbrella", translation: "Зонт", emoji: "☂️" },
  { letter: "V", word: "Violin", translation: "Скрипка", emoji: "🎻" },
  { letter: "W", word: "Watermelon", translation: "Арбуз", emoji: "🍉" },
  { letter: "X", word: "Xylophone", translation: "Ксилофон", emoji: "🎼" },
  { letter: "Y", word: "Yacht", translation: "Яхта", emoji: "⛵" },
  { letter: "Z", word: "Zebra", translation: "Зебра", emoji: "🏁" },
];

export default function EnglishAlphabetPage() {
  const navigate = useNavigate();
  const [selectedLetter, setSelectedLetter] = useState<LetterItem>(ALPHABET[0]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSelect = (item: LetterItem) => {
    setSelectedLetter(item);
    speak(`${item.letter}. ${item.word}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 p-4 pb-20">
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
            <h1 className="text-3xl font-black text-rose-600">English Alphabet</h1>
            <p className="text-sm text-muted-foreground">Нажимай на буквы и учи слова!</p>
          </div>
        </div>

        {/* Главная карточка выбранной буквы */}
        <Card className="p-6 bg-white border-2 border-rose-200 shadow-xl rounded-3xl text-center flex flex-col items-center justify-center space-y-4">
          <div className="text-8xl font-black text-rose-500 tracking-wider">
            {selectedLetter.letter}
          </div>
          <div className="text-6xl">{selectedLetter.emoji}</div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{selectedLetter.word}</div>
            <div className="text-sm text-slate-500">{selectedLetter.translation}</div>
          </div>
          <Button
            onClick={() => speak(`${selectedLetter.letter}. ${selectedLetter.word}`)}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-6 py-2 flex items-center gap-2 shadow-md"
          >
            <Volume2 className="w-5 h-5" />
            Озвучить
          </Button>
        </Card>

        {/* Сетка всех букв */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {ALPHABET.map((item) => (
            <button
              key={item.letter}
              onClick={() => handleSelect(item)}
              className={`p-3 rounded-2xl font-black text-xl border-2 transition-all shadow-sm flex flex-col items-center ${
                selectedLetter.letter === item.letter
                  ? "bg-rose-500 text-white border-rose-600 scale-105 shadow-md"
                  : "bg-white text-slate-700 border-rose-100 hover:bg-rose-50"
              }`}
            >
              <span>{item.letter}</span>
              <span className="text-xs font-normal opacity-80">{item.emoji}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
