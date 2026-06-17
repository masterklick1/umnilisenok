import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useUserProgress } from "@/hooks/useUserProgress";
import { speak } from "@/lib/sound";

type Item = {
  name: string;
  emoji: string;
  description: string;
  sound?: string;
};

type Topic = {
  id: string;
  name: string;
  emoji: string;
  items: Item[];
};

const itemSound = (item: Item) => item.sound || `Это ${item.name}. ${item.description}`;

const topics: Topic[] = [
  {
    id: "animals",
    name: "Животные",
    emoji: "🐾",
    items: [
      { name: "Кот", emoji: "🐱", description: "Домашнее животное, говорит 'мяу'" },
      { name: "Собака", emoji: "🐶", description: "Домашнее животное, говорит 'гав'" },
      { name: "Корова", emoji: "🐮", description: "Даёт молоко, говорит 'му'" },
      { name: "Лев", emoji: "🦁", description: "Царь зверей, живёт в Африке" },
      { name: "Слон", emoji: "🐘", description: "Самое большое животное на суше" },
      { name: "Медведь", emoji: "🐻", description: "Большой и сильный, любит мёд" },
      { name: "Рыба", emoji: "🐟", description: "Живёт в воде" },
      { name: "Птица", emoji: "🐦", description: "Умеет летать" },
      { name: "Тигр", emoji: "🐯", description: "Полосатый хищник из джунглей" },
      { name: "Обезьяна", emoji: "🐵", description: "Любит бананы и прыгает по деревьям" },
      { name: "Лягушка", emoji: "🐸", description: "Прыгает и говорит 'ква'" },
      { name: "Пингвин", emoji: "🐧", description: "Живёт там, где холодно" },
      { name: "Заяц", emoji: "🐰", description: "Любит морковку и быстро прыгает" },
      { name: "Лиса", emoji: "🦊", description: "Рыжая и хитрая" },
      { name: "Лошадь", emoji: "🐴", description: "Быстро бегает и катает людей" },
      { name: "Овечка", emoji: "🐑", description: "Даёт тёплую шерсть" },
    ],
  },
  {
    id: "nature",
    name: "Природа",
    emoji: "🌳",
    items: [
      { name: "Дерево", emoji: "🌳", description: "Растёт много лет, даёт кислород" },
      { name: "Цветок", emoji: "🌸", description: "Красивый и ароматный" },
      { name: "Солнце", emoji: "☀️", description: "Даёт свет и тепло" },
      { name: "Облако", emoji: "☁️", description: "Плывёт по небу" },
      { name: "Дождь", emoji: "🌧️", description: "Вода падает с неба" },
      { name: "Радуга", emoji: "🌈", description: "Появляется после дождя" },
      { name: "Гриб", emoji: "🍄", description: "Растёт в лесу" },
      { name: "Яблоко", emoji: "🍎", description: "Вкусный фрукт" },
      { name: "Луна", emoji: "🌙", description: "Светит ночью на небе" },
      { name: "Звезда", emoji: "⭐", description: "Сверкает в ночном небе" },
      { name: "Снег", emoji: "❄️", description: "Белый и холодный, падает зимой" },
      { name: "Гора", emoji: "⛰️", description: "Очень высокая и каменная" },
      { name: "Море", emoji: "🌊", description: "Большая солёная вода" },
      { name: "Огонь", emoji: "🔥", description: "Горячий и яркий" },
      { name: "Лист", emoji: "🍂", description: "Падает с деревьев осенью" },
    ],
  },
  {
    id: "transport",
    name: "Транспорт",
    emoji: "🚗",
    items: [
      { name: "Машина", emoji: "🚗", description: "Едет по дороге" },
      { name: "Автобус", emoji: "🚌", description: "Возит много людей" },
      { name: "Самолёт", emoji: "✈️", description: "Летает по небу" },
      { name: "Корабль", emoji: "🚢", description: "Плывёт по воде" },
      { name: "Поезд", emoji: "🚂", description: "Едет по рельсам" },
      { name: "Велосипед", emoji: "🚲", description: "Крутишь педали и едешь" },
      { name: "Скорая помощь", emoji: "🚑", description: "Везёт больных в больницу" },
      { name: "Пожарная машина", emoji: "🚒", description: "Тушит пожары" },
      { name: "Вертолёт", emoji: "🚁", description: "Летает с большими лопастями" },
      { name: "Ракета", emoji: "🚀", description: "Летит в космос" },
      { name: "Трактор", emoji: "🚜", description: "Работает в поле" },
      { name: "Метро", emoji: "🚇", description: "Поезд под землёй" },
      { name: "Такси", emoji: "🚕", description: "Возит людей за деньги" },
      { name: "Лодка", emoji: "⛵", description: "Плывёт по воде под парусом" },
    ],
  },
  {
    id: "professions",
    name: "Профессии",
    emoji: "👨‍⚕️",
    items: [
      { name: "Врач", emoji: "👨‍⚕️", description: "Лечит людей" },
      { name: "Учитель", emoji: "👨‍🏫", description: "Учит детей в школе" },
      { name: "Пожарный", emoji: "👨‍🚒", description: "Тушит пожары" },
      { name: "Строитель", emoji: "👷", description: "Строит дома" },
      { name: "Повар", emoji: "👨‍🍳", description: "Готовит еду" },
      { name: "Полицейский", emoji: "👮", description: "Следит за порядком" },
      { name: "Космонавт", emoji: "👨‍🚀", description: "Летает в космос" },
      { name: "Художник", emoji: "👨‍🎨", description: "Рисует картины" },
      { name: "Фермер", emoji: "🧑‍🌾", description: "Выращивает овощи и ухаживает за животными" },
      { name: "Учёный", emoji: "🧑‍🔬", description: "Делает опыты и открытия" },
      { name: "Музыкант", emoji: "🧑‍🎤", description: "Играет музыку и поёт" },
      { name: "Пилот", emoji: "🧑‍✈️", description: "Управляет самолётом" },
    ],
  },
  {
    id: "food",
    name: "Еда",
    emoji: "🍔",
    items: [
      { name: "Хлеб", emoji: "🍞", description: "Его едят каждый день" },
      { name: "Сыр", emoji: "🧀", description: "Жёлтый и вкусный" },
      { name: "Яйцо", emoji: "🥚", description: "Из него готовят омлет" },
      { name: "Молоко", emoji: "🥛", description: "Белое и полезное" },
      { name: "Суп", emoji: "🍲", description: "Тёплый и сытный" },
      { name: "Пицца", emoji: "🍕", description: "Любимое блюдо многих детей" },
      { name: "Мороженое", emoji: "🍦", description: "Холодное и сладкое" },
      { name: "Банан", emoji: "🍌", description: "Жёлтый и сладкий фрукт" },
      { name: "Морковь", emoji: "🥕", description: "Оранжевый овощ, полезный для глаз" },
      { name: "Конфета", emoji: "🍬", description: "Сладкая, её любят дети" },
      { name: "Сок", emoji: "🧃", description: "Вкусный напиток из фруктов" },
      { name: "Торт", emoji: "🍰", description: "Сладкий, его едят на праздник" },
      { name: "Печенье", emoji: "🍪", description: "Сладкое и хрустящее" },
      { name: "Виноград", emoji: "🍇", description: "Сладкие ягоды на грозди" },
    ],
  },
  {
    id: "body",
    name: "Части тела",
    emoji: "👀",
    items: [
      { name: "Глаза", emoji: "👀", description: "Ими мы видим" },
      { name: "Рука", emoji: "✋", description: "Ею мы берём предметы" },
      { name: "Нога", emoji: "🦶", description: "Ею мы ходим и бегаем" },
      { name: "Ухо", emoji: "👂", description: "Им мы слышим звуки" },
      { name: "Нос", emoji: "👃", description: "Им мы чувствуем запахи" },
      { name: "Рот", emoji: "👄", description: "Им мы говорим и едим" },
      { name: "Зуб", emoji: "🦷", description: "Им мы жуём еду" },
      { name: "Сердце", emoji: "❤️", description: "Оно стучит у нас в груди" },
      { name: "Язык", emoji: "👅", description: "Им мы чувствуем вкус" },
      { name: "Мозг", emoji: "🧠", description: "Им мы думаем" },
    ],
  },
  {
    id: "colors",
    name: "Цвета",
    emoji: "🎨",
    items: [
      { name: "Красный", emoji: "🔴", description: "Цвет помидора и клубники" },
      { name: "Синий", emoji: "🔵", description: "Цвет неба и моря" },
      { name: "Жёлтый", emoji: "🟡", description: "Цвет солнца и банана" },
      { name: "Зелёный", emoji: "🟢", description: "Цвет травы и листьев" },
      { name: "Оранжевый", emoji: "🟠", description: "Цвет апельсина и моркови" },
      { name: "Фиолетовый", emoji: "🟣", description: "Цвет сливы и баклажана" },
      { name: "Коричневый", emoji: "🟤", description: "Цвет шоколада и дерева" },
      { name: "Чёрный", emoji: "⚫", description: "Цвет ночи и угля" },
      { name: "Белый", emoji: "⚪", description: "Цвет снега и молока" },
      { name: "Розовый", emoji: "🩷", description: "Цвет цветка и жвачки" },
    ],
  },
  {
    id: "shapes",
    name: "Фигуры",
    emoji: "🔷",
    items: [
      { name: "Круг", emoji: "⭕", description: "Круглый, как солнышко" },
      { name: "Квадрат", emoji: "🟦", description: "У него четыре равные стороны" },
      { name: "Треугольник", emoji: "🔺", description: "У него три стороны" },
      { name: "Звезда", emoji: "⭐", description: "У неё пять лучиков" },
      { name: "Сердце", emoji: "❤️", description: "Символ любви" },
      { name: "Ромб", emoji: "🔶", description: "Похож на повёрнутый квадрат" },
      { name: "Прямоугольник", emoji: "🟧", description: "Похож на дверь или книгу" },
      { name: "Овал", emoji: "🥚", description: "Вытянутый круг, как яйцо" },
    ],
  },
  {
    id: "weather",
    name: "Погода",
    emoji: "☀️",
    items: [
      { name: "Солнечно", emoji: "☀️", description: "Светит яркое солнце" },
      { name: "Дождь", emoji: "🌧️", description: "С неба капает вода" },
      { name: "Снег", emoji: "🌨️", description: "Падают белые снежинки" },
      { name: "Гроза", emoji: "⛈️", description: "Сверкает молния и гремит гром" },
      { name: "Ветер", emoji: "💨", description: "Дует и качает деревья" },
      { name: "Радуга", emoji: "🌈", description: "Цветная дуга после дождя" },
      { name: "Туман", emoji: "🌫️", description: "Всё вокруг становится белым" },
      { name: "Облачно", emoji: "☁️", description: "Небо закрыто облаками" },
    ],
  },
  {
    id: "family",
    name: "Семья",
    emoji: "👨‍👩‍👧",
    items: [
      { name: "Мама", emoji: "👩", description: "Самый родной человек" },
      { name: "Папа", emoji: "👨", description: "Сильный и заботливый" },
      { name: "Бабушка", emoji: "👵", description: "Мама мамы или папы" },
      { name: "Дедушка", emoji: "👴", description: "Папа мамы или папы" },
      { name: "Брат", emoji: "👦", description: "Мальчик в семье" },
      { name: "Сестра", emoji: "👧", description: "Девочка в семье" },
      { name: "Малыш", emoji: "👶", description: "Самый маленький в семье" },
      { name: "Семья", emoji: "👨‍👩‍👧", description: "Все вместе и дружно" },
    ],
  },
  {
    id: "sport",
    name: "Спорт",
    emoji: "⚽",
    items: [
      { name: "Футбол", emoji: "⚽", description: "Играют мячом ногами" },
      { name: "Баскетбол", emoji: "🏀", description: "Бросают мяч в корзину" },
      { name: "Теннис", emoji: "🎾", description: "Бьют по мячу ракеткой" },
      { name: "Плавание", emoji: "🏊", description: "Плавают в бассейне" },
      { name: "Велоспорт", emoji: "🚴", description: "Гонки на велосипеде" },
      { name: "Бег", emoji: "🏃", description: "Кто быстрее добежит" },
      { name: "Лыжи", emoji: "⛷️", description: "Катаются по снегу" },
      { name: "Коньки", emoji: "⛸️", description: "Катаются по льду" },
      { name: "Бокс", emoji: "🥊", description: "Борьба в перчатках" },
      { name: "Гимнастика", emoji: "🤸", description: "Кувырки и прыжки" },
    ],
  },
  {
    id: "music",
    name: "Музыка",
    emoji: "🎵",
    items: [
      { name: "Гитара", emoji: "🎸", description: "Играют, перебирая струны" },
      { name: "Барабан", emoji: "🥁", description: "По нему стучат палочками" },
      { name: "Труба", emoji: "🎺", description: "В неё дуют, и она поёт" },
      { name: "Пианино", emoji: "🎹", description: "Нажимают на клавиши" },
      { name: "Скрипка", emoji: "🎻", description: "Играют смычком" },
      { name: "Микрофон", emoji: "🎤", description: "В него поют песни" },
      { name: "Саксофон", emoji: "🎷", description: "Большой золотой инструмент" },
      { name: "Ноты", emoji: "🎵", description: "Из них состоит музыка" },
    ],
  },
  {
    id: "clothes",
    name: "Одежда",
    emoji: "👕",
    items: [
      { name: "Футболка", emoji: "👕", description: "Носят летом" },
      { name: "Штаны", emoji: "👖", description: "Носят на ногах" },
      { name: "Платье", emoji: "👗", description: "Носят девочки" },
      { name: "Куртка", emoji: "🧥", description: "Носят, когда холодно" },
      { name: "Шапка", emoji: "🧢", description: "Носят на голове" },
      { name: "Носки", emoji: "🧦", description: "Носят на ногах под обувью" },
      { name: "Туфли", emoji: "👞", description: "Красивая обувь" },
      { name: "Кроссовки", emoji: "👟", description: "Удобная обувь для спорта" },
      { name: "Варежки", emoji: "🧤", description: "Греют руки зимой" },
      { name: "Шарф", emoji: "🧣", description: "Греет шею зимой" },
    ],
  },
  {
    id: "space",
    name: "Космос",
    emoji: "🪐",
    items: [
      { name: "Солнце", emoji: "☀️", description: "Большая горячая звезда" },
      { name: "Луна", emoji: "🌙", description: "Спутник нашей Земли" },
      { name: "Звезда", emoji: "⭐", description: "Светит далеко в космосе" },
      { name: "Планета", emoji: "🪐", description: "Большой шар в космосе" },
      { name: "Ракета", emoji: "🚀", description: "Летит к звёздам" },
      { name: "Космонавт", emoji: "👨‍🚀", description: "Человек, летающий в космос" },
      { name: "Комета", emoji: "☄️", description: "Летит с длинным хвостом" },
      { name: "Земля", emoji: "🌍", description: "Планета, на которой мы живём" },
    ],
  },
];

const generateQuizOptions = (correctItem: Item, allItems: Item[]): Item[] => {
  const options = [correctItem];
  const availableItems = allItems.filter(item => item.name !== correctItem.name);
  
  while (options.length < 4 && availableItems.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableItems.length);
    const randomItem = availableItems[randomIndex];
    if (!options.includes(randomItem)) {
      options.push(randomItem);
    }
    availableItems.splice(randomIndex, 1);
  }
  
  return options.sort(() => Math.random() - 0.5);
};

export default function WorldPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logCorrectAnswer, logWrongAnswer } = useActivityTracker();
  const { addStars } = useUserProgress();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [mode, setMode] = useState<"learn" | "quiz" | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [showResult, setShowResult] = useState<boolean | null>(null);

  const selectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setMode(null);
    setCurrentIndex(0);
    setScore(0);
    setTotal(0);
    setShowResult(null);
  };

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
    if (!selectedTopic) return;
    const randomIndex = Math.floor(Math.random() * selectedTopic.items.length);
    setCurrentIndex(randomIndex);
    setQuizOptions(generateQuizOptions(selectedTopic.items[randomIndex], selectedTopic.items));
  };

  const nextItem = () => {
    if (!selectedTopic) return;
    if (currentIndex < selectedTopic.items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const prevItem = () => {
    if (!selectedTopic) return;
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(selectedTopic.items.length - 1);
    }
  };

  const checkAnswer = (selected: Item) => {
    if (!selectedTopic) return;
    const correct = selected.name === selectedTopic.items[currentIndex].name;
    setShowResult(correct);
    setTotal(total + 1);
    
    if (correct) {
      setScore(score + 1);
      speak("Правильно! Молодец!");
      addStars(1, "world");
      logCorrectAnswer({ section: "world", topic: selectedTopic.id, item: selected.name });
      toast({
        title: "Правильно! 🎉",
        description: "Отличная работа! +1 ⭐",
      });
    } else {
      speak("Не правильно. Ещё раз подумай!");
      logWrongAnswer({ section: "world", topic: selectedTopic.id, expected: selectedTopic.items[currentIndex].name, got: selected.name });
      toast({
        title: "Попробуй ещё раз! 💪",
        description: `Правильный ответ: ${selectedTopic.items[currentIndex].name}`,
        variant: "destructive",
      });
    }

    setTimeout(() => {
      setShowResult(null);
      generateNewQuestion();
    }, 2000);
  };

  const resetToTopics = () => {
    setSelectedTopic(null);
    setMode(null);
    setCurrentIndex(0);
    setScore(0);
    setTotal(0);
    setShowResult(null);
  };

  const resetMode = () => {
    setMode(null);
    setCurrentIndex(0);
    setScore(0);
    setTotal(0);
    setShowResult(null);
  };

  const currentItem = selectedTopic ? selectedTopic.items[currentIndex] : null;

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
          <div className="text-6xl mb-4 animate-bounce-gentle">🌍</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            Окружающий мир
          </h1>
          <p className="text-lg text-muted-foreground">
            Познаём мир вокруг нас!
          </p>
        </div>

        {!selectedTopic && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8">
            {topics.map((topic) => (
              <Card
                key={topic.id}
                className="p-8 text-center hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 hover:border-primary/40"
                onClick={() => selectTopic(topic)}
              >
                <div className="text-5xl mb-4">{topic.emoji}</div>
                <h3 className="text-2xl font-bold">{topic.name}</h3>
                <p className="text-muted-foreground mt-2">{topic.items.length} карточек</p>
              </Card>
            ))}
          </div>
        )}

        {selectedTopic && !mode && (
          <div className="space-y-6">
            <Button variant="outline" onClick={resetToTopics} className="mb-4">
              ← Выбрать тему
            </Button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card 
                className="p-8 text-center hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20"
                onClick={startLearning}
              >
                <div className="text-5xl mb-4">📖</div>
                <h3 className="text-2xl font-bold mb-2">Учить</h3>
                <p className="text-muted-foreground">Познакомься с темой "{selectedTopic.name}"</p>
              </Card>

              <Card 
                className="p-8 text-center hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-secondary/10 to-secondary/5 border-2 border-secondary/20"
                onClick={startQuiz}
              >
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold mb-2">Викторина</h3>
                <p className="text-muted-foreground">Проверь свои знания</p>
              </Card>
            </div>
          </div>
        )}

        {mode === "learn" && currentItem && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold">
                {currentIndex + 1} из {selectedTopic!.items.length}
              </div>
              <Button variant="outline" onClick={resetMode}>
                Выбрать режим
              </Button>
            </div>

            <Card className="p-12 text-center">
              <div className="text-8xl mb-6">{currentItem.emoji}</div>
              
              <Button
                size="lg"
                variant="secondary"
                onClick={() => speak(itemSound(currentItem))}
                className="mb-8"
              >
                <Volume2 className="mr-2 h-5 w-5" />
                Послушать
              </Button>

              <div className="text-3xl font-bold mb-4 text-primary">{currentItem.name}</div>
              <div className="text-xl text-muted-foreground">{currentItem.description}</div>
            </Card>

            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={prevItem} variant="outline">
                ← Предыдущий
              </Button>
              <Button size="lg" onClick={nextItem}>
                Следующий →
              </Button>
            </div>
          </div>
        )}

        {mode === "quiz" && currentItem && (
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
                Что это?
              </div>
              
              <div className="text-8xl mb-8">{currentItem.emoji}</div>

              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {quizOptions.map((option) => (
                  <Button
                    key={option.name}
                    size="lg"
                    onClick={() => checkAnswer(option)}
                    disabled={showResult !== null}
                    className={`text-xl h-20 transition-all ${
                      showResult !== null && option.name === currentItem.name
                        ? "bg-green-500 hover:bg-green-600"
                        : ""
                    }`}
                  >
                    {option.name}
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
