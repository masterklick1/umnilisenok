import { useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { ArrowLeft, Mic, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedFox from "@/components/AnimatedFox";
import { SchoolModeGuard } from "@/components/child/SchoolModeGuard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { speak, stopSpeech } from "@/lib/sound";
import { TOYS, TOYS_ROUNDS, type Toy } from "@/lib/toys-lesson";

const lessonSpeech = registerPlugin<{
  checkAvailability(): Promise<{ available: boolean }>;
  listen(): Promise<{ alternatives: string[] }>;
  cancel(): Promise<void>;
}>("LessonSpeech");

const ANSWERS: Record<Toy, string[]> = {
  ball: ["мяч", "мячик"],
  doll: ["кукла", "куколка", "куклу", "куколку"],
  bear: ["мишка", "мишку", "медведь", "медведя", "медвежонок", "медвежонка", "плюшевый мишка", "плюшевого мишку"],
};

const TOY_QUESTIONS = TOYS_ROUNDS.map(({ target, choices }) => ({
  picture: `/lessons/toys/${target}.webp`,
  label: TOYS[target].word,
  phrase: TOYS[target].phrase,
  answers: ANSWERS[target],
  choices: choices.map((toy) => ({ picture: `/lessons/toys/${toy}.webp`, label: TOYS[toy].word })),
}));

const ACTIONS = {
  sleep: { word: "спит", ask: "Где мишка спит?", choices: ["eat", "sleep"] },
  eat: { word: "ест", ask: "Где мишка ест?", choices: ["eat", "play"] },
  play: { word: "играет", ask: "Где мишка играет?", choices: ["sleep", "play"] },
} as const;

const actionPicture = (action: keyof typeof ACTIONS) => `/lessons/bear-actions/${action}.webp`;
const actionPhrase = (action: keyof typeof ACTIONS) => `Мишка ${ACTIONS[action].word}`;

const ACTION_QUESTIONS = (["sleep", "eat", "play"] as const).map((action) => ({
  picture: actionPicture(action),
  label: actionPhrase(action),
  phrase: actionPhrase(action),
  answers: [ACTIONS[action].word, actionPhrase(action), `Он ${ACTIONS[action].word}`.toLowerCase()],
  choices: ACTIONS[action].choices.map((choice) => ({ picture: actionPicture(choice), label: actionPhrase(choice) })),
  ask: ACTIONS[action].ask,
}));

function matchesAnswer(phrase: string, answers: readonly string[]) {
  const word = phrase.toLowerCase().replace(/ё/g, "е")
    .replace(/[^а-я\s]/g, " ").trim().replace(/\s+/g, " ")
    .replace(/^(?:это|я вижу) /, "");
  return answers.some((answer) => answer.toLowerCase() === word);
}

export default function VoiceTeacherPage() {
  const [lesson, setLesson] = useState<"toys" | "actions">("toys");

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-background to-teal-50 px-3 py-3 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" className="mb-2 min-h-11 gap-2 px-3 text-base">
          <Link to="/"><ArrowLeft className="h-5 w-5" /> Назад</Link>
        </Button>
        <SchoolModeGuard>
          <div className="mb-3 grid grid-cols-2 gap-2" role="group" aria-label="Выбрать голосовой урок">
            <Button className="h-auto min-h-12 whitespace-normal px-2 py-2 text-base" aria-pressed={lesson === "toys"}
              variant={lesson === "toys" ? "default" : "outline"} onClick={() => setLesson("toys")}>Мои игрушки</Button>
            <Button className="h-auto min-h-12 whitespace-normal px-2 py-2 text-base" aria-pressed={lesson === "actions"}
              variant={lesson === "actions" ? "default" : "outline"} onClick={() => setLesson("actions")}>Что делает мишка?</Button>
          </div>
          <VoiceLesson key={lesson} actions={lesson === "actions"} />
        </SchoolModeGuard>
      </div>
    </main>
  );
}

function VoiceLesson({ actions }: { actions: boolean }) {
  const rounds = actions ? ACTION_QUESTIONS : TOY_QUESTIONS;
  const [index, setIndex] = useState(-1);
  const [canListen, setCanListen] = useState(false);
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [answered, setAnswered] = useState(false);
  const [pictureMatched, setPictureMatched] = useState(false);
  const attempt = useRef(0);
  const round = rounds[index];
  const finished = index === rounds.length;
  const toyQuestion = canListen ? "Что это за игрушка? Скажи или выбери картинку." : "Что это за игрушка? Выбери картинку.";
  const question = actions
    ? pictureMatched ? "Что делает мишка?" : ACTION_QUESTIONS[index]?.ask ?? ""
    : toyQuestion;

  useEffect(() => {
    let active = true;
    if (Capacitor.getPlatform() === "android") {
      void lessonSpeech.checkAvailability().then(({ available }) => {
        if (active) setCanListen(available);
      }).catch(() => {});
    }
    return () => {
      active = false;
      attempt.current += 1;
      if (Capacitor.getPlatform() === "android") void lessonSpeech.cancel().catch(() => {});
      void stopSpeech();
    };
  }, []);

  const goTo = (next: number) => {
    setIndex(next);
    setAnswered(false);
    setPictureMatched(false);
    setFeedback("");
    void speak(next === rounds.length ? "Молодец! Спасибо за игру!" : actions ? ACTION_QUESTIONS[next].ask : toyQuestion);
  };

  const respond = (correct: boolean, phrase: string) => {
    if (correct) {
      setAnswered(true);
      const reply = `Правильно! ${phrase}.`;
      setFeedback(reply);
      void speak(reply + " Нажми зелёную стрелку.");
    } else {
      const reply = actions && pictureMatched
        ? "Попробуй ещё раз или нажми зелёную стрелку."
        : "Попробуй ещё раз. Можно выбрать картинку.";
      setFeedback(reply);
      void speak(reply);
    }
  };

  const listen = async () => {
    if (!round || listening || answered) return;
    const current = ++attempt.current;
    setListening(true);
    setFeedback("");
    try {
      await stopSpeech();
      if (attempt.current !== current) return;
      const { alternatives } = await lessonSpeech.listen();
      if (attempt.current !== current) return;
      // Prefer the recognizer's first result so a low-ranked guess does not count.
      respond(matchesAnswer(alternatives[0] ?? "", round.answers), round.phrase);
    } catch (error) {
      if (attempt.current !== current) return;
      const code = (error as { code?: string } | null)?.code;
      const unavailable = code === "PERMISSION_DENIED" || code === "LANGUAGE_UNAVAILABLE" || code === "UNAVAILABLE";
      const fallback = actions ? "Нажми зелёную стрелку." : "Выбери картинку.";
      const reply = (unavailable ? "Микрофон недоступен. " : "Я не расслышал. ") + fallback;
      setFeedback(reply);
      if (code !== "CANCELLED") void speak(reply);
    } finally {
      if (attempt.current === current) setListening(false);
    }
  };

  const choosePicture = (picture: string) => {
    if (!round) return;
    if (!actions || picture !== round.picture) {
      respond(picture === round.picture, round.phrase);
      return;
    }
    setPictureMatched(true);
    setFeedback(`Правильно! ${round.phrase}.`);
    void speak(canListen
      ? `Да, ${round.phrase.toLowerCase()}. А теперь скажи: что делает мишка?`
      : `Да, ${round.phrase.toLowerCase()}. Повтори вслух и нажми зелёную стрелку.`);
  };

  return (
    <Card className="space-y-4 rounded-3xl p-3 text-center sm:space-y-5 sm:p-7">
      <header>
        <p className="text-base font-semibold text-teal-800 sm:text-lg">Голосовой урок</p>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{actions ? "Что делает мишка?" : "Мои игрушки"}</h1>
      </header>
      {!round && (
        <>
          <AnimatedFox size={242} />
          <p className="text-xl font-semibold sm:text-2xl">{finished ? actions ? "Молодец! Ты узнал, что делает мишка." : "Молодец! Ты узнал все игрушки." : "Лисёнок задаст три вопроса."}</p>
          <Button size="lg" className="h-auto min-h-14 w-full max-w-md whitespace-normal py-3 text-xl" onClick={() => goTo(0)}>{finished ? "Сыграть ещё раз" : "Начать урок"}</Button>
        </>
      )}
      {round && (
        <>
          <p className="text-base font-semibold text-muted-foreground">{index + 1} из {rounds.length}</p>
          {(!actions || pictureMatched) && (
            <img src={round.picture} alt={round.label}
              className="mx-auto aspect-square w-[clamp(12rem,36dvh,20rem)] max-w-full rounded-3xl object-cover" />
          )}
          <div className="mx-auto grid w-full max-w-md gap-2 min-[420px]:grid-flow-col min-[420px]:auto-cols-fr">
            <Button variant="outline" className="h-auto min-h-14 whitespace-normal px-2 py-2 text-lg" disabled={listening} onClick={() => void speak(answered ? feedback : question)}>
              <Volume2 className="mr-2 h-6 w-6 shrink-0" /> Послушать
            </Button>
            {canListen && !answered && (!actions || pictureMatched) && (
              <Button className="h-auto min-h-14 whitespace-normal px-2 py-2 text-lg" onClick={() => void listen()} disabled={listening}>
                <Mic className="mr-2 h-6 w-6 shrink-0" /> {listening ? "Слушаю…" : "Ответить голосом"}
              </Button>
            )}
          </div>
          {!answered && !pictureMatched && (
            <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3">
              {round.choices.map(({ picture, label }) => (
                <button key={picture} type="button" disabled={listening} onClick={() => choosePicture(picture)}
                  className="min-w-0 overflow-hidden rounded-3xl border-2 border-teal-200 enabled:hover:border-teal-600 focus-visible:outline focus-visible:outline-primary">
                  <img src={picture} alt={label} className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {feedback && <p className="text-xl font-semibold sm:text-2xl" role="status">{feedback}</p>}
          {(answered || pictureMatched) && <Button disabled={listening} className="h-auto min-h-14 w-full max-w-md bg-emerald-700 py-3 text-xl text-white hover:bg-emerald-800" size="lg"
            onClick={() => goTo(index + 1)}>Дальше <span aria-hidden="true" className="ml-2">→</span></Button>}
        </>
      )}
    </Card>
  );
}
