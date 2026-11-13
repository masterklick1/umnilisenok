// Адаптация занятия 013 «Мои игрушки» из курса «Русский через игру».
import { z } from "zod";

export const TOYS_LESSON_PATH = "/russian/toys";
export const TOYS_LESSON_EVENT = "toys_lesson_completed";

export const TOYS = {
  ball: { word: "мяч", request: "Покажи мяч", phrase: "Это мяч" },
  doll: { word: "кукла", request: "Покажи куклу", phrase: "Это кукла" },
  bear: { word: "мишка", request: "Покажи мишку", phrase: "Это мишка" },
} as const;

export type Toy = keyof typeof TOYS;

export const TOYS_ROUNDS: { target: Toy; choices: [Toy, Toy] }[] = [
  { target: "ball", choices: ["ball", "doll"] },
  { target: "doll", choices: ["bear", "doll"] },
  { target: "bear", choices: ["bear", "ball"] },
];

const toy = z.enum(["ball", "doll", "bear"]);
export const toysLessonResult = z.object({
  recognized: z.array(toy).max(3),
  practice: z.array(toy).max(3),
});

export const TOYS_HOME_GAME = "Положите рядом две игрушки и попросите: «Покажи мяч». Поменяйте игрушки местами и повторите. Затем предложите: «Мяч, пожалуйста». Ребёнок может показать, подать игрушку или сказать фразу.";
