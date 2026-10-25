import { speak as speakTTS } from "@/lib/sound";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { speakEnglish } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2, Dog, Palette, Hash, Utensils, Car, Users, Shirt, TreePine, Hand, Smile, Home, Sun, Apple } from "lucide-react";

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
  {
    id: "transport", name: "Транспорт", icon: <Car className="w-5 h-5" />,
    items: [
      { word: "Car", translation: "Машина", emoji: "🚗" },
      { word: "Bus", translation: "Автобус", emoji: "🚌" },
      { word: "Train", translation: "Поезд", emoji: "🚂" },
      { word: "Plane", translation: "Самолёт", emoji: "✈️" },
      { word: "Boat", translation: "Лодка", emoji: "⛵" },
      { word: "Bike", translation: "Велосипед", emoji: "🚲" },
    ],
  },
  {
    id: "family", name: "Семья", icon: <Users className="w-5 h-5" />,
    items: [
      { word: "Mom", translation: "Мама", emoji: "👩" },
      { word: "Dad", translation: "Папа", emoji: "👨" },
      { word: "Baby", translation: "Малыш", emoji: "👶" },
      { word: "Sister", translation: "Сестра", emoji: "👧" },
      { word: "Brother", translation: "Брат", emoji: "👦" },
      { word: "Grandma", translation: "Бабушка", emoji: "👵" },
    ],
  },
  {
    id: "clothes", name: "Одежда", icon: <Shirt className="w-5 h-5" />,
    items: [
      { word: "Hat", translation: "Шапка", emoji: "🧢" },
      { word: "Shirt", translation: "Рубашка", emoji: "👕" },
      { word: "Dress", translation: "Платье", emoji: "👗" },
      { word: "Shoes", translation: "Обувь", emoji: "👟" },
      { word: "Socks", translation: "Носки", emoji: "🧦" },
      { word: "Coat", translation: "Пальто", emoji: "🧥" },
    ],
  },
  {
    id: "nature", name: "Природа", icon: <TreePine className="w-5 h-5" />,
    items: [
      { word: "Sun", translation: "Солнце", emoji: "☀️" },
      { word: "Moon", translation: "Луна", emoji: "🌙" },
      { word: "Tree", translation: "Дерево", emoji: "🌳" },
      { word: "Flower", translation: "Цветок", emoji: "🌸" },
      { word: "Rain", translation: "Дождь", emoji: "🌧️" },
      { word: "Star", translation: "Звезда", emoji: "⭐" },
    ],
  },
  {
    id: "body", name: "Тело", icon: <Hand className="w-5 h-5" />,
    items: [
      { word: "Eyes", translation: "Глаза", emoji: "👀" },
      { word: "Nose", translation: "Нос", emoji: "👃" },
      { word: "Ear", translation: "Ухо", emoji: "👂" },
      { word: "Mouth", translation: "Рот", emoji: "👄" },
      { word: "Hand", translation: "Рука", emoji: "✋" },
      { word: "Foot", translation: "Нога", emoji: "🦶" },
    ],
  },
  {
    id: "emotions", name: "Эмоции", icon: <Smile className="w-5 h-5" />,
    items: [
      { word: "Happy", translation: "Радостный", emoji: "😊" },
      { word: "Sad", translation: "Грустный", emoji: "😢" },
      { word: "Angry", translation: "Сердитый", emoji: "😠" },
      { word: "Scared", translation: "Испуганный", emoji: "😨" },
      { word: "Surprised", translation: "Удивлённый", emoji: "😮" },
      { word: "Sleepy", translation: "Сонный", emoji: "😴" },
    ],
  },
  {
    id: "home", name: "Дом", icon: <Home className="w-5 h-5" />,
    items: [
      { word: "House", translation: "Дом", emoji: "🏠" },
      { word: "Bed", translation: "Кровать", emoji: "🛏️" },
      { word: "Chair", translation: "Стул", emoji: "🪑" },
      { word: "Door", translation: "Дверь", emoji: "🚪" },
      { word: "Window", translation: "Окно", emoji: "🪟" },
      { word: "Lamp", translation: "Лампа", emoji: "💡" },
    ],
  },
  {
    id: "weather", name: "Погода", icon: <Sun className="w-5 h-5" />,
    items: [
      { word: "Sun", translation: "Солнце", emoji: "☀️" },
      { word: "Rain", translation: "Дождь", emoji: "🌧️" },
      { word: "Snow", translation: "Снег", emoji: "❄️" },
      { word: "Wind", translation: "Ветер", emoji: "💨" },
      { word: "Cloud", translation: "Облако", emoji: "☁️" },
      { word: "Rainbow", translation: "Радуга", emoji: "🌈" },
    ],
  },
  {
    id: "fruits", name: "Фрукты", icon: <Apple className="w-5 h-5" />,
    items: [
      { word: "Banana", translation: "Банан", emoji: "🍌" },
      { word: "Orange", translation: "Апельсин", emoji: "🍊" },
      { word: "Grapes", translation: "Виноград", emoji: "🍇" },
      { word: "Pear", translation: "Груша", emoji: "🍐" },
      { word: "Cherry", translation: "Вишня", emoji: "🍒" },
      { word: "Lemon", translation: "Лимон", emoji: "🍋" },
    ],
  },
];

export default function EnglishWordsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>(CATEGORIES[0]);

  const speak = (text: string) => {
    void speakTTS(text, "en-US");
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
