import { ENGLISH_ANIMALS } from "./english-animals";
import { ENGLISH_VOCABULARY as WORDS } from "./english-vocabulary";

const ORDERS = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];

type Word = { word: string; translation: string; emoji: string; reply?: string };
type Unit = {
  title: string;
  label: string;
  icon: string;
  words: Word[];
  request?: (word: string) => string;
  question?: string;
};

const asNoun = (word: string) => `It's ${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}.`;

const UNITS: Unit[] = [
  { title: "Animals", label: "Животные", icon: "🐾", words: ENGLISH_ANIMALS.slice(0, 3) },
  {
    title: "Colors", label: "Цвета", icon: "🎨",
    words: WORDS.colors.slice(0, 3).map((item) => ({ ...item, reply: `It's ${item.word.toLowerCase()}.` })),
    request: (word) => `Show me ${word}.`,
    question: "What color is it?",
  },
  {
    title: "Numbers", label: "Счёт", icon: "🔢", question: "How many dots?",
    words: WORDS.numbers.slice(0, 3).map((item, index) => ({
      ...item, emoji: "●".repeat(index + 1),
      reply: index === 0 ? "One dot." : `${item.word} dots.`,
    })),
    request: (word) => `Find ${word} ${word === "one" ? "dot" : "dots"}.`,
  },
  { title: "Food", label: "Еда", icon: "🍎", words: [WORDS.food[1], WORDS.food[2], WORDS.food[4]] },
  { title: "Transport", label: "Транспорт", icon: "🚌", words: WORDS.transport.slice(0, 3) },
  {
    title: "Family", label: "Семья", icon: "👪", question: "Who is it?",
    words: WORDS.family.slice(0, 3).map((item, index) => ({
      ...item, reply: index === 2 ? "It's a baby." : `It's ${item.word}.`,
    })),
    request: (word) => word === "baby" ? "Show me the baby." : `Show me ${word === "mom" ? "Mom" : "Dad"}.`,
  },
  { title: "Clothes", label: "Одежда", icon: "👕", words: WORDS.clothes.slice(0, 3) },
  {
    title: "My body", label: "Части тела", icon: "✋",
    words: [WORDS.body[1], WORDS.body[2], WORDS.body[4]],
  },
  {
    title: "Nature", label: "Природа", icon: "🌻",
    words: WORDS.nature.slice(0, 3).map((item, index) => ({ ...item, reply: index < 2 ? `It's the ${item.word.toLowerCase()}.` : "It's a tree." })),
  },
  { title: "At home", label: "Дом", icon: "🏠", words: [WORDS.home[1], WORDS.home[2], WORDS.home[3]] },
];

export const ENGLISH_COURSE_UNITS = UNITS.map((unit, index) => ({
  label: unit.label,
  icon: unit.icon,
  firstLesson: index * ORDERS.length,
  size: ORDERS.length,
}));

export const ENGLISH_COURSE_LESSONS = UNITS.flatMap((unit, unitIndex) => {
  const request = unit.request ?? ((word: string) => `Show me the ${word}.`);
  const question = unit.question ?? "What is it?";
  const reply = (item: Word) => item.reply ?? asNoun(item.word.toLowerCase());
  return [
    { title: unit.title, description: "Услышь слово", prompt: (item: Word) => item.word.toLowerCase() },
    { title: request(unit.words[1].word.toLowerCase()).slice(0, -1), description: "Пойми просьбу", prompt: (item: Word) => request(item.word.toLowerCase()) },
    { title: question, description: "Повтори фразу", prompt: (item: Word) => `${question} ${reply(item)}` },
  ].map((lesson, index) => ({
    ...lesson, words: unit.words, unitIndex, order: ORDERS[index], repeat: index === 2, reply,
  }));
});
