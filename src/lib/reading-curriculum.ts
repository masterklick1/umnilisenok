// Учебная программа раздела «Чтение» для детей 3–7 лет

export type ReadingWord = {
  word: string;
  emoji: string;
};

// Уровень 1 — гласные буквы
export const VOWELS = ["А", "О", "У", "Ы", "И", "Э", "Е", "Ё", "Ю", "Я"];

// Уровень 2 — простые слоги (согласная + гласная)
export const SIMPLE_SYLLABLES = [
  "МА", "МО", "МУ", "ПА", "ПО", "ПУ", "БА", "БО", "БУ",
  "НА", "НО", "НУ", "КА", "КО", "КУ", "ТА", "ТО", "ТУ",
  "ДА", "ДО", "ДУ", "ЛА", "ЛО", "ЛУ", "ВА", "ВО", "ВУ",
  "СА", "СО", "СУ", "РА", "РО", "РУ", "ЛИ", "ЛЕ", "НИ",
  "ЗА", "ЗО", "ЗУ", "ГА", "ГО", "ГУ", "ША", "ШУ", "ЖА", "ЖУ", "ФА", "ХА",
];

// Уровень 3 — сложные слоги (мягкие согласные и сочетания)
export const COMPLEX_SYLLABLES = [
  "ЛЯ", "ЛЮ", "ЛИ", "МЯ", "МЮ", "НЯ", "НЮ", "КИ", "ПЕ",
  "СТО", "СТУ", "КРА", "КРО", "ТРИ", "ТРО", "ГРА", "ГРО",
  "ЗНА", "ПРИ", "СЛО", "ВНИ", "ДВО", "ПЧЕ", "СВЕ", "ЗДЕ",
  "БРА", "БРО", "ПЛА", "ПЛО", "КЛЮ", "ШКО", "СНЕ", "ЧАЙ", "ЛЁ", "РЯ",
];

// Уровень 4 — простые слова из 3–4 букв с картинками
export const READING_WORDS: ReadingWord[] = [
  { word: "ТОРТ", emoji: "🎂" },
  { word: "ПЁС", emoji: "🐕" },
  { word: "ЁЖ", emoji: "🦔" },
  { word: "ЗОНТ", emoji: "☂️" },
  { word: "ГРИБ", emoji: "🍄" },
  { word: "ЛИСТ", emoji: "🍃" },
  { word: "ПТИЦА", emoji: "🐦" },
  { word: "МАМА", emoji: "👩" },
  { word: "ПАПА", emoji: "👨" },
  { word: "КОТ", emoji: "🐱" },
  { word: "ДОМ", emoji: "🏠" },
  { word: "СОК", emoji: "🧃" },
  { word: "ЛУК", emoji: "🧅" },
  { word: "СЫР", emoji: "🧀" },
  { word: "ШАР", emoji: "🎈" },
  { word: "КИТ", emoji: "🐳" },
  { word: "РЫБА", emoji: "🐟" },
  { word: "ЛИСА", emoji: "🦊" },
  { word: "ЛУНА", emoji: "🌙" },
  { word: "РОЗА", emoji: "🌹" },
  { word: "ЛИМОН", emoji: "🍋" },
  { word: "МЯЧИК", emoji: "⚽" },
  { word: "ЁЖИК", emoji: "🦔" },
  { word: "ЖУК", emoji: "🪲" },
  { word: "МАК", emoji: "🌺" },
  { word: "ЛЕС", emoji: "🌲" },
  { word: "НОС", emoji: "👃" },
  { word: "СОВА", emoji: "🦉" },
  { word: "КОЗА", emoji: "🐐" },
  { word: "ВАЗА", emoji: "🏺" },
  { word: "ЛУЖА", emoji: "💧" },
  { word: "ЗИМА", emoji: "❄️" },
  { word: "ПИЛА", emoji: "🪚" },
  { word: "ВОДА", emoji: "💦" },
  { word: "НОГА", emoji: "🦶" },
  { word: "РУКА", emoji: "✋" },
  { word: "ЛОДКА", emoji: "⛵" },
  { word: "ЗАЙКА", emoji: "🐰" },
  { word: "МАШИНА", emoji: "🚗" },
  { word: "КОРОВА", emoji: "🐄" },
  { word: "СОБАКА", emoji: "🐶" },
  { word: "РАКЕТА", emoji: "🚀" },
  { word: "ЯБЛОКО", emoji: "🍎" },
];

export const pickRandom = <T,>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

/** Перемешать буквы слова/слога для сборки */
export const shuffleLetters = (text: string): string[] => {
  const letters = text.split("");
  if (letters.length < 2) return letters;
  let shuffled = letters;
  // гарантируем, что буквы не остались в правильном порядке
  let tries = 0;
  while (shuffled.join("") === text && tries < 10) {
    shuffled = [...letters].sort(() => Math.random() - 0.5);
    tries += 1;
  }
  return shuffled;
};

/** Варианты для викторины «выбери картинку» — 2 неверных + верная */
export const pickPictureOptions = (
  correct: ReadingWord,
  count = 3
): ReadingWord[] => {
  const others = READING_WORDS.filter((w) => w.word !== correct.word);
  const options = [correct];
  while (options.length < count && others.length) {
    const idx = Math.floor(Math.random() * others.length);
    options.push(others.splice(idx, 1)[0]);
  }
  return options.sort(() => Math.random() - 0.5);
};

/** Варианты букв для викторины «найди гласную» */
export const pickLetterOptions = (correct: string, pool: string[], count = 4): string[] => {
  const others = pool.filter((l) => l !== correct);
  const options = [correct];
  while (options.length < count && others.length) {
    const idx = Math.floor(Math.random() * others.length);
    options.push(others.splice(idx, 1)[0]);
  }
  return options.sort(() => Math.random() - 0.5);
};
