import { useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { speak } from "@/lib/sound";

const POSITIONS = {
  on: { label: "Мишка на стуле", placement: "left-[36%] bottom-[44%]" },
  under: { label: "Мишка под стулом", placement: "left-[36%] bottom-[9%]" },
  beside: { label: "Мишка рядом со стулом", placement: "left-[68%] bottom-[9%]" },
} as const;

type Position = keyof typeof POSITIONS;

const ROUNDS: { answer: Position; choices: Position[]; prompt: string }[] = [
  { answer: "on", choices: ["beside", "on", "under"], prompt: "Покажи мишку на стуле" },
  { answer: "under", choices: ["under", "beside", "on"], prompt: "Покажи мишку под стулом" },
  { answer: "beside", choices: ["on", "under", "beside"], prompt: "Покажи мишку рядом со стулом" },
];

function Scene({ position }: { position: Position }) {
  return (
    <span aria-hidden="true" className="relative mx-auto block aspect-square w-full max-w-40">
      <span className="absolute inset-x-[3%] bottom-[8%] h-px bg-teal-200" />
      <span className="absolute left-[16%] top-[12%] h-[45%] w-[11%] rounded-t bg-amber-700" />
      <span className="absolute left-[16%] top-[21%] h-[9%] w-[20%] rounded bg-amber-700" />
      <span className="absolute bottom-[8%] left-[16%] h-[37%] w-[8%] rounded-b bg-amber-800" />
      <span className="absolute bottom-[8%] left-[60%] h-[37%] w-[8%] rounded-b bg-amber-800" />
      <span className="absolute bottom-[44%] left-[16%] h-[10%] w-[52%] rounded bg-amber-700" />
      <span className={`absolute w-[24%] leading-none text-[clamp(1.25rem,5vw,2.4rem)] ${POSITIONS[position].placement}`}>🧸</span>
    </span>
  );
}

export function BearPositionGame({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState<Position[]>([]);
  const [correct, setCorrect] = useState(false);
  const [showText, setShowText] = useState(false);
  const [score, setScore] = useState(0);
  const round = ROUNDS[index];
  const locked = correct || wrong.length === 2;

  const goTo = (next: number) => {
    setIndex(next);
    setWrong([]);
    setCorrect(false);
    setShowText(false);
    void speak(ROUNDS[next]?.prompt ?? "Спасибо за игру!");
  };

  const pick = (position: Position) => {
    if (!round || locked || wrong.includes(position)) return;
    if (position === round.answer) {
      setCorrect(true);
      setScore((value) => value + 1);
      void speak(`Правильно. ${POSITIONS[position].label}.`);
      return;
    }
    setWrong([...wrong, position]);
    void speak(wrong.length === 0 ? `Попробуй ещё раз. ${round.prompt}.` : POSITIONS[round.answer].label);
  };

  return (
    <Card className="space-y-4 rounded-3xl p-4 text-center sm:p-8">
      <h2 className="text-2xl font-extrabold">Где мишка?</h2>
      {round ? (
        <>
          <p className="text-sm font-semibold text-muted-foreground">Задание {index + 1} из {ROUNDS.length}</p>
          <Button onClick={() => void speak(round.prompt)}>
            <Volume2 className="mr-2 h-5 w-5" /> Послушать задание
          </Button>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {round.choices.map((position) => (
              <button
                key={position}
                type="button"
                aria-label={POSITIONS[position].label}
                disabled={locked || wrong.includes(position)}
                onClick={() => pick(position)}
                className={`rounded-xl border-2 bg-teal-50 p-1 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 ${
                  locked && position === round.answer ? "border-green-600" : "border-teal-200 enabled:hover:border-teal-600 disabled:opacity-50"
                }`}
              >
                <Scene position={position} />
              </button>
            ))}
          </div>
          {locked ? (
            <p role="status" className="font-semibold">
              {correct ? "Правильно! " : ""}{POSITIONS[round.answer].label}.
            </p>
          ) : (
            <>
              {wrong.length > 0 && <p role="status">Попробуй ещё раз.</p>}
              <Button variant="ghost" aria-expanded={showText} onClick={() => setShowText((value) => !value)}>
                {showText ? "Скрыть текст задания" : "Показать текст задания"}
              </Button>
              {showText && <p className="font-semibold">{round.prompt}</p>}
            </>
          )}
        </>
      ) : (
        <>
          <p>Ты нашёл мишку в {score} из {ROUNDS.length} заданий.</p>
          <div className="rounded-2xl bg-teal-50 p-4 text-left text-teal-950">
            <h3 className="font-bold">Игра дома</h3>
            <p className="mt-1 text-sm">Посади мишку на стул, поставь под стул и рядом со стулом. Потом поменяйтесь ролями: пусть ребёнок попросит тебя поставить мишку.</p>
          </div>
        </>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={onBack}>К игрушкам</Button>
        {round && locked && <Button onClick={() => goTo(index + 1)}>{index + 1 === ROUNDS.length ? "Посмотреть итог" : "Дальше"}</Button>}
        {!round && <Button onClick={() => { setScore(0); goTo(0); }}>Сыграть ещё раз</Button>}
      </div>
    </Card>
  );
}
