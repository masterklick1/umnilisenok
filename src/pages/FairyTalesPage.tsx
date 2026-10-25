import { StreakBonusBanner } from "@/components/StreakBonusBanner";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2, ChevronLeft, ChevronRight } from "lucide-react";
import { speak } from "@/lib/sound";
import { recordLearned } from "@/lib/learning-progress";

type Tale = {
  id: string;
  title: string;
  emoji: string;
  pages: { emoji: string; text: string }[];
  question: { q: string; options: string[]; correct: string };
};

const GRADS = ["from-amber-100 to-orange-100","from-sky-100 to-blue-100","from-pink-100 to-rose-100","from-emerald-100 to-teal-100","from-violet-100 to-purple-100","from-yellow-100 to-lime-100"];

const TALES: Tale[] = [
  {
    id: "tri-medvedya", title: "Три медведя", emoji: "🐻",
    pages: [
      { emoji: "🌲", text: "Девочка Маша пошла в лес и нашла домик." },
      { emoji: "🥣", text: "В домике стояли три миски с кашей: большая, средняя и маленькая." },
      { emoji: "🪑", text: "Маша села на маленький стульчик и сломала его." },
      { emoji: "🛏️", text: "Маша легла в маленькую кроватку и уснула." },
      { emoji: "🐻", text: "Пришли медведи домой, Маша проснулась и убежала." },
    ],
    question: { q: "Сколько было медведей?", options: ["2", "3", "5"], correct: "3" },
  },
  {
    id: "zayushkina", title: "Заюшкина избушка", emoji: "🐰",
    pages: [
      { emoji: "🏠", text: "У зайца была избушка лубяная, а у лисы ледяная." },
      { emoji: "☀️", text: "Пришла весна, и у лисы избушка растаяла." },
      { emoji: "🦊", text: "Лиса попросилась к зайцу и выгнала его." },
      { emoji: "🐓", text: "Пришёл петушок с косой и прогнал лису." },
      { emoji: "🐰", text: "Стали заяц и петушок жить вместе дружно." },
    ],
    question: { q: "Кто прогнал лису?", options: ["🐻", "🐓", "🐺"], correct: "🐓" },
  },
  {
    id: "kolobok",
    title: "Колобок",
    emoji: "🟡",
    pages: [
      { emoji: "👵", text: "Жили-были дед и баба. Испекла баба румяный Колобок." },
      { emoji: "🪟", text: "Положила его на окошко остывать. А Колобок скатился и покатился по дорожке." },
      { emoji: "🐰", text: "Встретил он зайца. Колобок спел ему песенку и укатился." },
      { emoji: "🐺", text: "Потом встретил волка, а за ним медведя. И от них Колобок укатился!" },
      { emoji: "🦊", text: "А хитрая лиса попросила спеть ещё раз, поближе. Не надо верить хитрецам!" },
    ],
    question: { q: "Кто хитрее всех в сказке?", options: ["🐰", "🦊", "🐻"], correct: "🦊" },
  },
  {
    id: "repka",
    title: "Репка",
    emoji: "🥕",
    pages: [
      { emoji: "👴", text: "Посадил дед репку. Выросла репка большая-пребольшая." },
      { emoji: "👵", text: "Тянет-потянет, вытянуть не может. Позвал дед бабку." },
      { emoji: "👧", text: "Бабка позвала внучку, внучка — Жучку, Жучка — кошку." },
      { emoji: "🐭", text: "Позвала кошка мышку. Тянут-потянут — и вытянули репку!" },
      { emoji: "🤝", text: "Вместе мы можем всё! Дружба помогает." },
    ],
    question: { q: "Кто прибежал последним?", options: ["🐱", "🐶", "🐭"], correct: "🐭" },
  },
  {
    id: "kurochka",
    title: "Курочка Ряба",
    emoji: "🐔",
    pages: [
      { emoji: "🐔", text: "Жили-были дед да баба. И была у них курочка Ряба." },
      { emoji: "🥚", text: "Снесла курочка яичко, не простое — золотое." },
      { emoji: "🔨", text: "Дед бил-бил — не разбил. Баба била-била — не разбила." },
      { emoji: "🐭", text: "Мышка бежала, хвостиком махнула — яичко упало и разбилось." },
      { emoji: "🥚", text: "Не плачь, дед, не плачь, баба! Я снесу вам яичко простое." },
    ],
    question: { q: "Какое яичко снесла курочка сначала?", options: ["🥚", "🌟", "🍎"], correct: "🌟" },
  },
  {
    id: "teremok",
    title: "Теремок",
    emoji: "🏡",
    pages: [
      { emoji: "🏡", text: "Стоит в поле теремок. Прибежала мышка и стала там жить." },
      { emoji: "🐸", text: "Прискакала лягушка, потом зайчик, потом лисичка." },
      { emoji: "🐺", text: "Прибежал волчок-серый бочок. Стали жить все вместе." },
      { emoji: "🐻", text: "Пришёл медведь, полез в теремок — и раздавил его!" },
      { emoji: "🔨", text: "Не беда! Построили все вместе новый теремок, лучше прежнего." },
    ],
    question: { q: "Кто сломал теремок?", options: ["🐺", "🐻", "🦊"], correct: "🐻" },
  },
  {
    id: "volk-kozlyata", title: "Волк и семеро козлят", emoji: "🐐",
    pages: [
      { emoji: "🐐", text: "Жила-была коза с козлятами. Уходила она в лес и велела никому не открывать." },
      { emoji: "🐺", text: "Пришёл волк и запел грубым голосом. Козлята не открыли!" },
      { emoji: "🎤", text: "Волк сделал голос тоненьким, и козлята открыли дверь." },
      { emoji: "🏠", text: "Волк утащил козлят, только самый маленький спрятался в печке." },
      { emoji: "🎉", text: "Коза прогнала волка и спасла козлят. Нельзя открывать дверь чужим!" },
    ],
    question: { q: "Кому нельзя открывать дверь?", options: ["👩", "🐺", "🐐"], correct: "🐺" },
  },
  {
    id: "lisa-zhuravl", title: "Лиса и журавль", emoji: "🦩",
    pages: [
      { emoji: "🦊", text: "Лиса позвала журавля в гости и угостила кашей на тарелке." },
      { emoji: "🍽️", text: "Журавль стучал клювом, но ничего не смог съесть." },
      { emoji: "🏺", text: "Журавль позвал лису к себе и налил окрошку в высокий кувшин." },
      { emoji: "😿", text: "Лиса не смогла достать. Как аукнется, так и откликнется!" },
    ],
    question: { q: "Во что журавль налил угощение?", options: ["🍽️", "🏺", "🥣"], correct: "🏺" },
  },
  {
    id: "gusi-lebedi", title: "Гуси-лебеди", emoji: "🦢",
    pages: [
      { emoji: "👧", text: "Девочка заигралась, а гуси-лебеди унесли её братца." },
      { emoji: "🍎", text: "Она побежала искать. Ей помогли яблоня, печка и речка." },
      { emoji: "🏚️", text: "У Бабы-яги девочка нашла братца и схватила его." },
      { emoji: "🏡", text: "Они успели домой до прихода родителей. Надо беречь младших!" },
    ],
    question: { q: "Кто унёс братца?", options: ["🦢", "🦉", "🐺"], correct: "🦢" },
  },
];

const RIDDLES: Tale[] = [
  { id: "r-ezh", title: "Колючий клубок", emoji: "❓", pages: [{ emoji: "🌲", text: "Сердитый недотрога живёт в глуши лесной. Иголок очень много, а нитки ни одной." }], question: { q: "Кто это?", options: ["🦔", "🐻", "🐰"], correct: "🦔" } },
  { id: "r-morkov", title: "Красная девица", emoji: "❓", pages: [{ emoji: "🌱", text: "Сидит девица в темнице, а коса на улице." }], question: { q: "Что это?", options: ["🍎", "🥕", "🍓"], correct: "🥕" } },
  { id: "r-solnce", title: "Над землёй", emoji: "❓", pages: [{ emoji: "🌤️", text: "Утром светит, днём греет, а вечером за лес прячется." }], question: { q: "Что это?", options: ["🌙", "⭐", "☀️"], correct: "☀️" } },
  { id: "r-kot", title: "Усатый друг", emoji: "❓", pages: [{ emoji: "🏠", text: "Мягкие лапки, а в лапках царапки. Молоко пьёт, песенки поёт." }], question: { q: "Кто это?", options: ["🐶", "🐱", "🐭"], correct: "🐱" } },
  { id: "r-zayac", title: "Длинные уши", emoji: "❓", pages: [{ emoji: "❄️", text: "Летом серый, зимой белый. Прыгает ловко, любит морковку." }], question: { q: "Кто это?", options: ["🐰", "🦊", "🐿️"], correct: "🐰" } },
  { id: "r-dozhd", title: "С неба", emoji: "❓", pages: [{ emoji: "☁️", text: "Шумит он в поле и в саду, а в дом не попадёт. И никуда я не иду, покуда он идёт." }], question: { q: "Что это?", options: ["🌧️", "🌈", "💨"], correct: "🌧️" } },
  { id: "r-korova", title: "На лугу", emoji: "❓", pages: [{ emoji: "🌾", text: "Спереди пятачок, сзади крючок, посередине спинка, на спинке щетинка." }], question: { q: "Кто это?", options: ["🐄", "🐷", "🐑"], correct: "🐷" } },
  { id: "r-belka", title: "Рыжая хозяйка", emoji: "❓", pages: [{ emoji: "🌰", text: "Рыжий хвостик, быстрые лапки, в дупле орешки прячет." }], question: { q: "Кто это?", options: ["🐿️", "🦊", "🐻"], correct: "🐿️" } },
];

const RHYMES: Tale[] = [
  { id: "c-zaychik", title: "Зайчик погулять", emoji: "🔢", pages: [
    { emoji: "🐰", text: "Раз, два, три, четыре, пять — вышел зайчик погулять." },
    { emoji: "🏃", text: "Вдруг охотник выбегает, прямо в зайчика стреляет." },
    { emoji: "😊", text: "Пиф-паф, ой-ой-ой! Умирает зайчик мой... Нет! Убежал он домой!" },
  ], question: { q: "Сколько чисел в считалке?", options: ["3", "5", "10"], correct: "5" } },
  { id: "c-mesyac", title: "Вышел месяц", emoji: "🔢", pages: [
    { emoji: "🌙", text: "Вышел месяц из тумана, вынул ножик из кармана." },
    { emoji: "✋", text: "Буду резать, буду бить — всё равно тебе водить!" },
  ], question: { q: "Кто вышел из тумана?", options: ["☀️", "🌙", "⭐"], correct: "🌙" } },
  { id: "c-gusi", title: "Шли гусята", emoji: "🔢", pages: [
    { emoji: "🐥", text: "Один, два, три — по дорожке шли гусята." },
    { emoji: "🐥", text: "Четыре, пять — стали травку щипать." },
    { emoji: "🌿", text: "Сколько было гусят? Посчитай скорей, ребят!" },
  ], question: { q: "Сколько гусят?", options: ["3", "5", "7"], correct: "5" } },
  { id: "c-kotik", title: "Котик в садик", emoji: "🔢", pages: [
    { emoji: "🐱", text: "Раз, два — кот идёт по двору." },
    { emoji: "🐾", text: "Три, четыре — лапки чистые помыли." },
    { emoji: "🥛", text: "Пять — молоко пить! Шесть — кашу есть!" },
  ], question: { q: "Что пил котик?", options: ["🥛", "🧃", "☕"], correct: "🥛" } },
  { id: "c-zvezdy", title: "Звёздочки", emoji: "🔢", pages: [
    { emoji: "⭐", text: "Раз звезда и два звезда — светят в небе как всегда." },
    { emoji: "🌟", text: "Три звезда — зажглась опять. Кто считает — будет знать!" },
  ], question: { q: "Сколько звёзд?", options: ["2", "3", "4"], correct: "3" } },
];

type Mode = "tales" | "riddles" | "rhymes";
const MODES: { key: Mode; label: string; list: Tale[]; prefix: string }[] = [
  { key: "tales", label: "📚 Сказки", list: TALES, prefix: "" },
  { key: "riddles", label: "❓ Загадки", list: RIDDLES, prefix: "Загадка: " },
  { key: "rhymes", label: "🔢 Считалки", list: RHYMES, prefix: "Считалка: " },
];

export default function FairyTalesPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("tales");
  const [tale, setTale] = useState<Tale | null>(null);
  const [page, setPage] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const current = MODES.find((m) => m.key === mode)!;

  const isQuiz = tale ? page >= tale.pages.length : false;

  useEffect(() => {
    if (!tale) return;
    if (isQuiz) void speak(tale.question.q);
    else void speak(tale.pages[page].text);
  }, [tale, page, isQuiz]);

  const choose = (opt: string) => {
    if (!tale) return;
    setAnswer(opt);
    if (opt === tale.question.correct) {
      void speak("Молодец! Правильно!");
      void recordLearned("tales", current.prefix + tale.title);
    } else {
      void speak("Подумай ещё!");
    }
  };

  if (!tale) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5 p-4">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Назад
          </Button>
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 animate-bounce-gentle">📖</div>
            <h1 className="text-4xl font-extrabold text-gradient mb-2">Сказки</h1>
            <p className="text-lg text-muted-foreground">Слушаем и отвечаем на вопросы!</p>
          </div>
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            {MODES.map((m) => (
              <Button key={m.key} variant={mode === m.key ? "default" : "outline"} className="rounded-full" onClick={() => setMode(m.key)}>
                {m.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {current.list.map((t, i) => (
              <Card
                key={t.id}
                onClick={() => { setTale(t); setPage(0); setAnswer(null); }}
                className={`group relative overflow-hidden p-8 text-center cursor-pointer rounded-3xl border-0 shadow-md card-glow animate-pop-in hover:scale-[1.03] transition-all duration-300 bg-gradient-to-br ${GRADS[i % GRADS.length]}`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/5" />
                <div className="relative z-10 text-6xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{t.emoji}</div>
                <h3 className="relative z-10 text-2xl font-extrabold">{t.title}</h3>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5 p-4 flex flex-col">
      <StreakBonusBanner />
      <Button variant="ghost" className="self-start" onClick={() => setTale(null)}>
        <ArrowLeft className="w-5 h-5 mr-2" /> Назад к списку
      </Button>
      <h1 className="text-2xl font-bold text-center my-2">{tale.title}</h1>
      <Card className="flex-1 max-w-md w-full mx-auto p-6 flex flex-col items-center justify-center text-center gap-6">
        {!isQuiz ? (
          <>
            <div className="text-8xl">{tale.pages[page].emoji}</div>
            <p className="text-xl leading-relaxed">{tale.pages[page].text}</p>
            <Button variant="outline" onClick={() => void speak(tale.pages[page].text)}>
              <Volume2 className="w-5 h-5 mr-2" /> Послушать
            </Button>
          </>
        ) : (
          <>
            <p className="text-xl font-bold">{tale.question.q}</p>
            <div className="flex gap-4">
              {tale.question.options.map((o) => (
                <button
                  key={o}
                  onClick={() => choose(o)}
                  className={`text-6xl p-3 rounded-2xl border-4 ${
                    answer === o ? (o === tale.question.correct ? "border-green-500" : "border-red-400") : "border-transparent"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            {answer === tale.question.correct && (
              <Button onClick={() => setTale(null)}>Дальше ⭐</Button>
            )}
          </>
        )}
      </Card>
      <div className="flex justify-between max-w-md w-full mx-auto mt-4">
        <Button disabled={page === 0} onClick={() => { setPage(page - 1); setAnswer(null); }}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="self-center text-muted-foreground">
          {Math.min(page + 1, tale.pages.length + 1)} / {tale.pages.length + 1}
        </span>
        <Button disabled={isQuiz} onClick={() => setPage(page + 1)}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
