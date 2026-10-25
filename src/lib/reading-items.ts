import { VOWELS, SIMPLE_SYLLABLES, COMPLEX_SYLLABLES, READING_WORDS } from "@/lib/reading-curriculum";

export const READING_LEVEL_TITLES: Record<number, string> = {
  1: "Гласные буквы",
  2: "Простые слоги",
  3: "Сложные слоги",
  4: "Простые слова",
};

export const readingItemsForLevel = (level: number): string[] =>
  level === 1
    ? VOWELS
    : level === 2
      ? SIMPLE_SYLLABLES
      : level === 3
        ? COMPLEX_SYLLABLES
        : READING_WORDS.map((w) => w.word);
