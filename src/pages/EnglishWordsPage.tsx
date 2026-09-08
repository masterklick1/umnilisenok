import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2, Dog, Palette, Hash, Utensils } from "lucide-react";

interface WordItem {
  word: string;
  translation: string;
  emoji: string;
}

interface Category {
  id: string;
  name: string;
  icon: JSX.Element;
  items: WordItem[];
}

const CATEGORIES: Category[] = [
  {
    id: "animals",
    name: "Животные",
    icon: <Dog className="w-5 h-5" />,
    items: [
      { word: "Cat", translation: "Кошка", emoji: "🐱" },
      { word: "Dog", translation: "Собака", emoji: "🐶" },
      { word: "Bear", translation: "Медведь", emoji: "🐻" },
      { word: "Rabbit", translation: "Кролик", emoji: "🐰" },
      { word: "Fox", translation: "Лиса", emoji: "🦊" },
      { word: "Panda", translation: "Панда", emoji: "🐼" },
    ],
  },
  {
    id: "colors",
    name: "Цвета",
    icon: <Palette className="w-5 h-5" />,
    items: [
      { word: "Red", translation: "Красный", emoji: "🔴" },
      { word: "Blue", translation: "Синий", emoji: "🔵" },
      { word: "Yellow", translation: "Желтый", emoji: "🟡" },
      { word: "Green", translation: "Зеленый", emoji: "🟢" },
      { word: "Orange", translation: "Оранжевый", emoji: "🟠" },
      { word: "Purple", translation: "Фиолетовый", emoji: "🟣" },
    ],
  },
  {
    id: "numbers",
    name: "Цифры",
    icon: <Hash className="w-5 h-5" />,
    items: [
      { word: "One", translation: "Один", emoji: "1️⃣" },
      { word: "Two", translation: "Два", emoji: "2️⃣" },
      { word: "Three", translation: "Три", emoji: "3️⃣" },
      { word: "Four", translation: "Четыре", emoji: "4️⃣" },
      { word: "Five", translation: "Пять", emoji: "5️⃣" },
      { word: "Ten", translation: "Десять", emoji: "🔟" },
    ],
  },
  {
    id: "food",
    name: "Еда",
    icon: <Utensils className="w-5 h-5" />,
    items: [
      { word: "Pizza", translation: "Пицца", emoji: "🍕" },
      { word: "Apple", translation: "Яблоко", emoji: "🍎" },
      { word: "Banana", translation: "Банан", emoji: "🍌" },
      { word: "Ice Cream", translation: "Мороженое", emoji: "🍦" },
      { word: "Cake", translation: "Торт", emoji: "🎂" },
      { word: "Cookie", translation: "Печенье", emoji: "🍪" },
    ],
  },
];

export default function EnglishWordsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>(CATEGORIES[0]);

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-4 pb-20">
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
            <h1 className="text-3xl font-black text-amber-600">First Words</h1>
            <p className="text-sm text-muted-foreground">Первые английские слова</p>
          </div>
        </div>

        {/* Переключатель категорий */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-2xl px-4 py-2 flex items-center gap-2 whitespace-nowrap transition-all ${
                activeCategory.id === cat.id
                  ? "bg-amber-500 text-white shadow-md scale-105"
                  : "bg-white text-slate-700 hover:bg-amber-100"
              }`}
            >
              {cat.icon}
              <span className="font-bold">{cat.name}</span>
            </Button>
          ))}
        </div>

        {/* Сетка слов */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {activeCategory.items.map((item) => (
            <Card
              key={item.word}
              onClick={() => speak(item.word)}
              className="p-5 bg-white border-2 border-amber-200 rounded-3xl text-center cursor-pointer hover:scale-105 transition-all shadow-sm flex flex-col items-center justify-between min-h-[150px]"
            >
              <div className="text-5xl my-2">{item.emoji}</div>
              <div>
                <div className="text-xl font-bold text-slate-800">{item.word}</div>
                <div className="text-xs text-slate-500">{item.translation}</div>
              </div>
              <div className="mt-3 text-amber-500 p-2 bg-amber-50 rounded-full">
                <Volume2 className="w-4 h-4" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
