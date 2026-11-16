import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { speak } from "@/lib/sound";

const COLORS = {
  red: { ball: "красный", car: "красную", className: "bg-red-600" },
  yellow: { ball: "жёлтый", car: "жёлтую", className: "bg-yellow-400" },
  blue: { ball: "синий", car: "синюю", className: "bg-blue-600" },
} as const;

type Color = keyof typeof COLORS;
type Toy = "ball" | "car";
type Choice = { toy: Toy; color: Color };

const ROUNDS: { target: Choice; distractor: Color; position: number }[] = [
  { target: { toy: "ball", color: "red" }, distractor: "yellow", position: 0 },
  { target: { toy: "car", color: "blue" }, distractor: "red", position: 2 },
  { target: { toy: "ball", color: "yellow" }, distractor: "blue", position: 1 },
  { target: { toy: "car", color: "red" }, distractor: "yellow", position: 1 },
  { target: { toy: "ball", color: "blue" }, distractor: "red", position: 2 },
  { target: { toy: "car", color: "yellow" }, distractor: "blue", position: 0 },
];

const toyLabel = ({ toy, color }: Choice) => toy === "ball"
  ? `${COLORS[color].ball} мяч`
  : `${COLORS[color].car} машинку`;



function ToyPicture({ toy, color }: Choice) {
  const paint = COLORS[color].className;
  if (toy === "ball") {
    return <span aria-hidden="true" className={`block aspect-square w-3/4 max-w-24 rounded-full bg-gradient-to-br from-white/50 to-black/20 shadow-sm ${paint}`} />;
  }
  return (
    <span aria-hidden="true" className="relative block h-14 w-full max-w-28 sm:h-20">
      <span className={`absolute inset-x-[22%] top-1/4 h-1/3 rounded-t-2xl border-[3px] border-current text-white/30 ${paint}`} />
      <span className={`absolute inset-x-[5%] bottom-[19%] h-1/3 rounded-lg ${paint}`} />
      <span className="absolute bottom-[8%] left-[17%] aspect-square w-1/5 rounded-full bg-slate-800" />
      <span className="absolute bottom-[8%] right-[17%] aspect-square w-1/5 rounded-full bg-slate-800" />
    </span>
  );
}

export function ColorListeningGame({ onBack }: { onBack: () => void }) {
  const { t, language } = useLanguage();
  const labelFor = (target: Choice) => t(toyLabel(target), `${target.color} ${target.toy}`);
  const promptFor = (target: Choice) => t(
    `${target.toy === "ball" ? "Покажи" : "Дай"} ${toyLabel(target)}`,
    `Show me the ${labelFor(target)}`,
  );
  const speakPrompt = (text: string) => speak(text, language === "en" ? "en-US" : "ru-RU");
  const { logCorrectAnswer, logWrongAnswer } = useActivityTracker();
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"ready" | "retry" | "correct" | "shown">("ready");
  const [showText, setShowText] = useState(false);
  const [score, setScore] = useState(0);
  const round = ROUNDS[index];
  const locked = feedback === "correct" || feedback === "shown";

  const pick = (choice: Choice) => {
    if (locked || !round) return;
    const expected = toyLabel(round.target);
    const answer = toyLabel(choice);
    const details = { section: "world", topic: "colors", mode: "listening", expected, got: answer };
    if (answer === expected) {
      setScore((value) => value + 1);
      setFeedback("correct");
      void logCorrectAnswer({ ...details, item: expected });
      void speakPrompt(t("Правильно! Молодец!", "That’s right! Well done!"));
      return;
    }
    void logWrongAnswer(details);
    if (feedback === "ready") {
      setFeedback("retry");
      void speakPrompt(t(`Попробуй ещё раз. ${promptFor(round.target)}.`, `Try again. ${promptFor(round.target)}.`));
    } else {
      setFeedback("shown");
      void speakPrompt(promptFor(round.target));
    }
  };

  const goTo = (nextIndex: number) => {
    setIndex(nextIndex);
    setFeedback("ready");
    const next = ROUNDS[nextIndex];
    void speakPrompt(next ? promptFor(next.target) : t("Спасибо за игру!", "Thanks for playing!"));
  };

  if (!round) {
    return (
      <Card className="mx-auto max-w-xl space-y-4 rounded-3xl p-6 text-center sm:p-8">
        <h2 className="text-2xl font-bold">{t("Спасибо за игру!", "Thanks for playing!")}</h2>
        <p>{t("Ты нашёл", "You found")} {score} {t("из", "of")} {ROUNDS.length} {t("игрушек.", "toys.")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => { setScore(0); goTo(0); }}>{t("Сыграть ещё раз", "Play again")}</Button>
          <Button variant="outline" onClick={onBack}>{t("К цветам", "Back to colors")}</Button>
        </div>
      </Card>
    );
  }

  const options: Choice[] = [
    { toy: round.target.toy, color: round.distractor },
    { toy: round.target.toy === "ball" ? "car" : "ball", color: round.target.color },
  ];
  options.splice(round.position, 0, round.target);
  const prompt = promptFor(round.target);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Button variant="outline" onClick={onBack}>{t("← К цветам", "← Back to colors")}</Button>
      <Card className="space-y-4 rounded-3xl p-4 text-center sm:p-8">
        <p className="text-sm font-semibold text-muted-foreground">{t("Задание", "Task")} {index + 1} {t("из", "of")} {ROUNDS.length}</p>
        <h2 className="text-2xl font-bold">{t("Послушай и покажи", "Listen and point")}</h2>
        <Button size="lg" onClick={() => void speakPrompt(prompt)}>
          <Volume2 className="mr-2 h-5 w-5" /> {t("Послушать задание", "Listen to the task")}
        </Button>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {options.map((choice) => {
            const label = toyLabel(choice);
            const highlight = locked && choice === round.target;
            return (
              <button key={label} type="button" aria-label={label} disabled={locked}
                onClick={() => pick(choice)}
                className={`flex aspect-square items-center justify-center rounded-2xl border-2 bg-card p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${highlight ? "border-green-600" : "border-border enabled:hover:border-primary"}`}>
                <ToyPicture {...choice} />
              </button>
            );
          })}
        </div>
        <Button variant="ghost" aria-expanded={showText} onClick={() => setShowText((value) => !value)}>
          {showText ? t("Скрыть текст задания", "Hide the words") : t("Показать текст задания", "Show the words")}
        </Button>
        {showText && <p className="text-lg font-semibold">{prompt}</p>}
        {feedback !== "ready" && (
          <p role="status" className="font-semibold">
            {feedback === "retry" && t("Попробуй ещё раз.", "Try again.")}
            {feedback === "correct" && t("Правильно! Молодец!", "That’s right! Well done!")}
            {feedback === "shown" && t(`Вот нужная игрушка. ${prompt}.`, `Here’s the toy. ${prompt}.`)}
          </p>
        )}
        {locked && <Button onClick={() => goTo(index + 1)}>{index + 1 === ROUNDS.length ? t("Посмотреть итог", "See results") : t("Дальше", "Next")}</Button>}
      </Card>
    </div>
  );
}
