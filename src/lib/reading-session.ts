import { z } from "zod";
import { readingItemsForLevel } from "@/lib/reading-items";

export const READING_LESSON_LENGTH = 5;

const readingLevel = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type ReadingLevel = z.infer<typeof readingLevel>;

const readingSession = z.object({
  level: readingLevel,
  items: z.array(z.string()).min(1).max(READING_LESSON_LENGTH),
  index: z.number().int().nonnegative(),
  score: z.number().int().nonnegative(),
  mistakes: z.array(z.string()),
  feedback: z.enum(["retry", "correct", "incorrect"]).nullable(),
}).refine(({ level, items, index, score, mistakes, feedback }) =>
  index <= items.length && score <= index + (feedback === "correct" ? 1 : 0) &&
  (index < items.length || feedback === null) &&
  items.every((item) => readingItemsForLevel(level).includes(item)) &&
  mistakes.every((item) => items.includes(item)),
);

export type ReadingSession = z.infer<typeof readingSession>;

const sessionKey = (childId: string) => `reading_lesson_v1_${childId}`;

export const loadReadingSession = (childId: string | null): ReadingSession | null => {
  if (!childId) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(sessionKey(childId)) ?? "null");
    const result = readingSession.safeParse(saved);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

export const saveReadingSession = (childId: string | null, session: ReadingSession) => {
  if (!childId) return;
  try {
    localStorage.setItem(sessionKey(childId), JSON.stringify(session));
  } catch {
    // The lesson can still run when browser storage is unavailable.
  }
};

export const startReadingSession = (
  level: ReadingLevel,
  learned: ReadonlySet<string>,
  repeatItems?: string[],
): ReadingSession => {
  const items = [...new Set(readingItemsForLevel(level))];
  const remaining = items.filter((item) => !learned.has(item));
  return {
    level,
    items: (repeatItems ?? (remaining.length ? remaining : items)).slice(0, READING_LESSON_LENGTH),
    index: 0,
    score: 0,
    mistakes: [],
    feedback: null,
  };
};
