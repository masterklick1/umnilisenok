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
  sound: string;
};

type Topic = {
  id: string;
  name: string;
  emoji: string;
  items: Item[];
};

const topics: Topic[] = [
  {
    id: "animals",
    name: "Животные",
    emoji: "🐾",
    items: [
      { name: "Кот", emoji: "🐱", description: "Домашнее животное, говорит 'мяу'", sound: "Это кот. Домашнее животное, говорит мяу" },
      { name: "Собака", emoji: "🐶", description: "Домашнее животное, говорит 'гав'", sound: "Это собака. Домашнее животное, говорит гав" },
      { name: "Корова", emoji: "🐮", description: "Даёт молоко, говорит 'му'", sound: "Это корова. Даёт молоко, говорит му" },
      { name: "Лев", emoji: "🦁", description: "Царь зверей, живёт в Африке", sound: "Это лев. Царь зверей, живёт в Африке" },
      { name: "Слон", emoji: "🐘", description: "Самое большое животное на суше", sound: "Это слон. Самое большое животное на суше" },
      { name: "Медведь", emoji: "🐻", description: "Большой и сильный, любит мёд", sound: "Это медведь. Большой и сильный, любит мёд" },
      { name: "Рыба", emoji: "🐟", description: "Живёт в воде", sound: "Это рыба. Живёт в воде" },
      { name: "Птица", emoji: "🐦", description: "Умеет летать", sound: "Это птица. Умеет летать" },
      { name: "Тигр", emoji: "🐯", description: "Полосатый хищник из джунглей", sound: "Это тигр. Полосатый хищник из джунглей" },
      { name: "Обезьяна", emoji: "🐵", description: "Любит бананы и прыгает по деревьям", sound: "Это обезьяна. Любит бананы и прыгает по деревьям" },
      { name: "Лягушка", emoji: "🐸", description: "Прыгает и говорит 'ква'", sound: "Это лягушка. Прыгает и говорит ква" },
      { name: "Пингвин", emoji: "🐧", description: "Живёт там, где холодно", sound: "Это пингвин. Живёт там, где холодно" },
    ]
  },
  {
    id: "nature",
    name: "Природа",
    emoji: "🌳",
    items: [
      { name: "Дерево", emoji: "🌳", description: "Растёт много лет, даёт кислород", sound: "Это дерево. Растёт много лет, даёт кислород" },
      { name: "Цветок", emoji: "🌸", description: "Красивый и ароматный", sound: "Это цветок. Красивый и ароматный" },
      { name: "Солнце", emoji: "☀️", description: "Даёт свет и тепло", sound: "Это солнце. Даёт свет и тепло" },
      { name: "Облако", emoji: "☁️", description: "Плывёт по небу", sound: "Это облако. Плывёт по небу" },
      { name: "Дождь", emoji: "🌧️", description: "Вода падает с неба", sound: "Это дождь. Вода падает с неба" },
      { name: "Радуга", emoji: "🌈", description: "Появляется после дождя", sound: "Это радуга. Появляется после дождя" },
      { name: "Гриб", emoji: "🍄", description: "Растёт в лесу", sound: "Это гриб. Растёт в лесу" },
      { name: "Яблоко", emoji: "🍎", description: "Вкусный фрукт", sound: "Это яблоко. Вкусный фрукт" },
      { name: "Луна", emoji: "🌙", description: "Светит ночью на небе", sound: "Это луна. Светит ночью на небе" },
      { name: "Звезда", emoji: "⭐", description: "Сверкает в ночном небе", sound: "Это звезда. Сверкает в ночном небе" },
      { name: "Снег", emoji: "❄️", description: "Белый и холодный, падает зимой", sound: "Это снег. Белый и холодный, падает зимой" },
      { name: "Гора", emoji: "⛰️", description: "Очень высокая и каменная", sound: "Это гора. Очень высокая и каменная" },
    ]
  },
  {
    id: "transport",
    name: "Транспорт",
    emoji: "🚗",
    items: [
      { name: "Машина", emoji: "🚗", description: "Едет по дороге", sound: "Это машина. Едет по дороге" },
      { name: "Автобус", emoji: "🚌", description: "Возит много людей", sound: "Это автобус. Возит много людей" },
      { name: "Самолёт", emoji: "✈️", description: "Летает по небу", sound: "Это самолёт. Летает по небу" },
      { name: "Корабль", emoji: "🚢", description: "Плывёт по воде", sound: "Это корабль. Плывёт по воде" },
      { name: "Поезд", emoji: "🚂", description: "Едет по рельсам", sound: "Это поезд. Едет по рельсам" },
      { name: "Велосипед", emoji: "🚲", description: "Крутишь педали и едешь", sound: "Это велосипед. Крутишь педали и едешь" },
      { name: "Скорая помощь", emoji: "🚑", description: "Везёт больных в больницу", sound: "Это скорая помощь. Везёт больных в больницу" },
      { name: "Пожарная машина", emoji: "🚒", description: "Тушит пожары", sound: "Это пожарная машина. Тушит пожары" },
      { name: "Вертолёт", emoji: "🚁", description: "Летает с большими лопастями", sound: "Это вертолёт. Летает с большими лопастями" },
      { name: "Ракета", emoji: "🚀", description: "Летит в космос", sound: "Это ракета. Летит в космос" },
      { name: "Трактор", emoji: "🚜", description: "Работает в поле", sound: "Это трактор. Работает в поле" },
      { name: "Метро", emoji: "🚇", description: "Поезд под землёй", sound: "Это метро. Поезд под землёй" },
    ]
  },
  {
    id: "professions",
    name: "Профессии",
    emoji: "👨‍⚕️",
    items: [
      { name: "Врач", emoji: "👨‍⚕️", description: "Лечит людей", sound: "Это врач. Лечит людей" },
      { name: "Учитель", emoji: "👨‍🏫", description: "Учит детей в школе", sound: "Это учитель. Учит детей в школе" },
      { name: "Пожарный", emoji: "👨‍🚒", description: "Тушит пожары", sound: "Это пожарный. Тушит пожары" },
      { name: "Строитель", emoji: "👷", description: "Строит дома", sound: "Это строитель. Строит дома" },
      { name: "Повар", emoji: "👨‍🍳", description: "Готовит еду", sound: "Это повар. Готовит еду" },
      { name: "Полицейский", emoji: "👮", description: "Следит за порядком", sound: "Это полицейский. Следит за порядком" },
      { name: "Космонавт", emoji: "👨‍🚀", description: "Летает в космос", sound: "Это космонавт. Летает в космос" },
      { name: "Художник", emoji: "👨‍🎨", description: "Рисует картины", sound: "Это художник. Рисует картины" },
      { name: "Фермер", emoji: "🧑‍🌾", description: "Выращивает овощи и ухаживает за животными", sound: "Это фермер. Выращивает овощи и ухаживает за животными" },
      { name: "Учёный", emoji: "🧑‍🔬", description: "Делает опыты и открытия", sound: "Это учёный. Делает опыты и открытия" },
    ]
  },
  {
    id: "food",
    name: "Еда",
    emoji: "🍔",
    items: [
      { name: "Хлеб", emoji: "🍞", description: "Его едят каждый день", sound: "Это хлеб. Его едят каждый день" },
      { name: "Сыр", emoji: "🧀", description: "Жёлтый и вкусный", sound: "Это сыр. Жёлтый и вкусный" },
      { name: "Яйцо", emoji: "🥚", description: "Из него готовят омлет", sound: "Это яйцо. Из него готовят омлет" },
      { name: "Молоко", emoji: "🥛", description: "Белое и полезное", sound: "Это молоко. Белое и полезное" },
      { name: "Суп", emoji: "🍲", description: "Тёплый и сытный", sound: "Это суп. Тёплый и сытный" },
      { name: "Пицца", emoji: "🍕", description: "Любимое блюдо многих детей", sound: "Это пицца. Любимое блюдо многих детей" },
      { name: "Мороженое", emoji: "🍦", description: "Холодное и сладкое", sound: "Это мороженое. Холодное и сладкое" },
      { name: "Банан", emoji: "🍌", description: "Жёлтый и сладкий фрукт", sound: "Это банан. Жёлтый и сладкий фрукт" },
    ]
  },
  {
    id: "body",
    name: "Части тела",
    emoji: "👀",
    items: [
      { name: "Глаза", emoji: "👀", description: "Ими мы видим", sound: "Это глаза. Ими мы видим" },
      { name: "Рука", emoji: "✋", description: "Ею мы берём предметы", sound: "Это рука. Ею мы берём предметы" },
      { name: "Нога", emoji: "🦶", description: "Ею мы ходим и бегаем", sound: "Это нога. Ею мы ходим и бегаем" },
      { name: "Ухо", emoji: "👂", description: "Им мы слышим звуки", sound: "Это ухо. Им мы слышим звуки" },
      { name: "Нос", emoji: "👃", description: "Им мы чувствуем запахи", sound: "Это нос. Им мы чувствуем запахи" },
      { name: "Рот", emoji: "👄", description: "Им мы говорим и едим", sound: "Это рот. Им мы говорим и едим" },
      { name: "Зуб", emoji: "🦷", description: "Им мы жуём еду", sound: "Это зуб. Им мы жуём еду" },
      { name: "Сердце", emoji: "❤️", description: "Оно стучит у нас в груди", sound: "Это сердце. Оно стучит у нас в груди" },
    ]
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
      logWrongAnswer({ topic: selectedTopic.id, expected: selectedTopic.items[currentIndex].name, got: selected.name });
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
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
                onClick={() => speak(currentItem.sound)}
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
