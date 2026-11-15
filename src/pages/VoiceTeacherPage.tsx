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

function matchesAnswer(phrase: string, target: Toy) {
  const word = phrase.toLowerCase().replace(/ё/g, "е")
    .replace(/[^а-я\s]/g, " ").trim().replace(/\s+/g, " ")
    .replace(/^(?:это|я вижу) /, "");
  return ANSWERS[target].includes(word);
}

export default function VoiceTeacherPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-background to-teal-50 px-4 py-5">
      <div className="mx-auto max-w-lg">
        <Button asChild variant="ghost" className="mb-3 gap-2">
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Назад</Link>
        </Button>
        <SchoolModeGuard><VoiceLesson /></SchoolModeGuard>
      </div>
    </main>
  );
}

function VoiceLesson() {
  const [index, setIndex] = useState(-1);
  const [canListen, setCanListen] = useState(false);
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [answered, setAnswered] = useState(false);
  const attempt = useRef(0);
  const round = TOYS_ROUNDS[index];
  const finished = index === TOYS_ROUNDS.length;
  const question = canListen ? "Что это за игрушка? Скажи или выбери картинку." : "Что это за игрушка? Выбери картинку.";

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
    setFeedback("");
    void speak(next === TOYS_ROUNDS.length ? "Молодец! Спасибо за игру!" : question);
  };

  const respond = (correct: boolean, target: Toy) => {
    if (correct) {
      setAnswered(true);
      const reply = `Правильно! ${TOYS[target].phrase}.`;
      setFeedback(reply);
      void speak(reply + " Нажми зелёную стрелку.");
    } else {
      const reply = "Попробуй ещё раз. Можно выбрать картинку.";
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
      respond(matchesAnswer(alternatives[0] ?? "", round.target), round.target);
    } catch (error) {
      if (attempt.current !== current) return;
      const code = (error as { code?: string } | null)?.code;
      const reply = code === "PERMISSION_DENIED" || code === "LANGUAGE_UNAVAILABLE" || code === "UNAVAILABLE"
        ? "Микрофон недоступен. Выбери картинку."
        : "Я не расслышал. Попробуй ещё раз или выбери картинку.";
      setFeedback(reply);
      if (code !== "CANCELLED") void speak(reply);
    } finally {
      if (attempt.current === current) setListening(false);
    }
  };

  return (
    <Card className="space-y-4 rounded-3xl p-4 text-center sm:p-8">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Голосовой урок · Мои игрушки</h1>
      {!round && (
        <>
          <AnimatedFox size={148} />
          <p className="text-lg font-semibold">{finished ? "Молодец! Ты узнал все игрушки." : "Лисёнок задаст три вопроса."}</p>
          <Button size="lg" onClick={() => goTo(0)}>{finished ? "Сыграть ещё раз" : "Начать урок"}</Button>
        </>
      )}
      {round && (
        <>
          <p className="text-sm font-semibold text-muted-foreground">{index + 1} из {TOYS_ROUNDS.length}</p>
          <img src={`/lessons/toys/${round.target}.webp`} alt={TOYS[round.target].word}
            className="mx-auto aspect-square w-36 rounded-2xl object-cover sm:w-48" />
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" disabled={listening} onClick={() => void speak(answered ? feedback : question)}>
              <Volume2 className="mr-2 h-5 w-5" /> Послушать
            </Button>
            {canListen && !answered && (
              <Button onClick={() => void listen()} disabled={listening}>
                <Mic className="mr-2 h-5 w-5" /> {listening ? "Слушаю…" : "Ответить голосом"}
              </Button>
            )}
          </div>
          {!answered && (
            <div className="mx-auto grid max-w-xs grid-cols-2 gap-3">
              {round.choices.map((toy) => (
                <button key={toy} type="button" disabled={listening} onClick={() => respond(toy === round.target, round.target)}
                  className="overflow-hidden rounded-2xl border-2 border-teal-200 enabled:hover:border-teal-600 focus-visible:outline focus-visible:outline-primary">
                  <img src={`/lessons/toys/${toy}.webp`} alt={TOYS[toy].word} className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {feedback && <p className="font-semibold" role="status">{feedback}</p>}
          {answered && <Button className="bg-emerald-700 text-white hover:bg-emerald-800" size="lg"
            onClick={() => goTo(index + 1)}>Дальше <span aria-hidden="true" className="ml-2">→</span></Button>}
        </>
      )}
    </Card>
  );
}
