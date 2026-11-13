import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BearPositionGame } from "@/components/russian/BearPositionGame";
import { SchoolModeGuard } from "@/components/child/SchoolModeGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { getActivityChildId, logChildActivity } from "@/lib/activity-log";
import { speak } from "@/lib/sound";
import {
  TOYS, TOYS_HOME_GAME, TOYS_LESSON_EVENT, TOYS_LESSON_PATH, TOYS_ROUNDS, type Toy,
} from "@/lib/toys-lesson";

const TOY_ORDER: Toy[] = ["ball", "doll", "bear"];
type Stage = "intro" | "listen" | "choose" | "say" | "done";

function ToyPicture({ toy }: { toy: Toy }) {
  return <img src={`/lessons/toys/${toy}.webp`} alt={TOYS[toy].word} className="mx-auto aspect-square w-full max-w-48 rounded-2xl object-cover" />;
}

export default function ToysLessonPage() {
  const { user, isDemo, loading } = useAuth();
  const { isChild, loading: roleLoading } = useUserRole();
  if (loading || (user && !isDemo && roleLoading)) {
    return <p className="p-6 text-center" role="status">Загружаем урок…</p>;
  }

  const childId = isChild ? user?.id : getActivityChildId(user?.id);
  const reportChildId = user && !isDemo && childId && (isChild || childId !== user.id) ? childId : null;
  const backTo = !user ? "/auth" : reportChildId || isDemo ? "/" : "/parent";

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-background to-teal-50 px-4 py-5 text-foreground">
      <div className="mx-auto max-w-xl">
        <Button asChild variant="ghost" className="mb-3 gap-2">
          <Link to={backTo}><ArrowLeft className="h-4 w-4" /> Назад</Link>
        </Button>
        <SchoolModeGuard>
          <ToysLesson key={user?.id + ":" + reportChildId} childId={reportChildId} userId={user?.id} />
        </SchoolModeGuard>
      </div>
    </main>
  );
}

function ToysLesson({ userId, childId }: { userId?: string; childId: string | null }) {
  const [playingPositions, setPlayingPositions] = useState(false);
  const [stage, setStage] = useState<Stage>("intro");
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [recognized, setRecognized] = useState<Toy[]>([]);
  const [practice, setPractice] = useState<Toy[]>([]);
  const [showWords, setShowWords] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saving = useRef(false);
  const round = TOYS_ROUNDS[index];
  const toy = TOYS[stage === "listen" ? TOY_ORDER[index] : round.target];

  const save = async () => {
    if (!childId || saving.current) return;
    saving.current = true;
    setSaveStatus("saving");
    try {
      const saved = await logChildActivity(userId, TOYS_LESSON_EVENT, TOYS_LESSON_PATH, {
        section: "russian", recognized, practice,
      }, childId);
      setSaveStatus(saved ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    } finally {
      saving.current = false;
    }
  };

  const start = () => {
    setIndex(0);
    setAttempt(0);
    setRecognized([]);
    setPractice([]);
    setShowWords(false);
    setSaveStatus("idle");
    setStage("listen");
    void speak(TOYS.ball.phrase);
  };

  const nextWord = () => {
    if (index + 1 < TOY_ORDER.length) {
      setIndex(index + 1);
      void speak(TOYS[TOY_ORDER[index + 1]].phrase);
    } else {
      setIndex(0);
      setStage("choose");
      void speak(TOYS[TOYS_ROUNDS[0].target].request);
    }
  };

  const pick = (choice: Toy) => {
    if (choice !== round.target) {
      setPractice((items) => items.includes(round.target) ? items : [...items, round.target]);
      if (attempt === 0) {
        setAttempt(1);
        void speak(`Попробуй ещё раз. ${toy.request}.`);
        return;
      }
    } else {
      setRecognized((items) => [...items, round.target]);
    }
    setStage("say");
    void speak(toy.phrase);
  };

  const nextRound = () => {
    if (index + 1 === TOYS_ROUNDS.length) {
      setStage("done");
      void speak("Спасибо за игру!");
      void save();
    } else {
      setIndex(index + 1);
      setAttempt(0);
      setShowWords(false);
      setStage("choose");
      void speak(TOYS[TOYS_ROUNDS[index + 1].target].request);
    }
  };

  if (playingPositions) return <BearPositionGame onBack={() => setPlayingPositions(false)} />;

  return (
    <>
      <header className="mb-5">
        <p className="font-semibold text-teal-800">Русский через игру</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight">Мои игрушки</h1>
      </header>
      <Card className="rounded-3xl p-5 shadow-sm sm:p-8">
        {stage === "intro" && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {TOY_ORDER.map((item) => <ToyPicture key={item} toy={item} />)}
            </div>
            <h2 className="text-2xl font-bold">Послушай, покажи, скажи</h2>
            <p className="text-muted-foreground">Лисёнок назовёт три игрушки. Потом покажи, какую он попросит. Если захочешь, повтори фразу вслух.</p>
            <Button size="lg" className="w-full gap-2" onClick={start}>
              <Volume2 className="h-5 w-5" /> Начать урок
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={() => setPlayingPositions(true)}>
              Где мишка?
            </Button>
          </div>
        )}

        {stage === "listen" && (
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold text-teal-800">Знакомимся · {index + 1} из {TOY_ORDER.length}</p>
            <ToyPicture toy={TOY_ORDER[index]} />
            <h2 className="text-3xl font-extrabold">{toy.phrase}</h2>
            <Button variant="outline" onClick={() => void speak(toy.phrase)} className="gap-2">
              <Volume2 className="h-5 w-5" /> Послушать ещё
            </Button>
            <Button size="lg" className="w-full gap-2" onClick={nextWord}>
              {index + 1 === TOY_ORDER.length ? "Поиграем" : "Следующая игрушка"} <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}

        {stage === "choose" && (
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold text-teal-800">Найди игрушку · {index + 1} из {TOYS_ROUNDS.length}</p>
            <h2 className="text-2xl font-extrabold">Послушай и покажи</h2>
            <Button size="lg" variant="outline" onClick={() => void speak(toy.request)} className="gap-2">
              <Volume2 className="h-5 w-5" /> Послушать задание
            </Button>
            <div className="grid grid-cols-2 gap-3">
              {round.choices.map((item) => (
                <button key={item} type="button" onClick={() => pick(item)}
                  className="rounded-2xl border-2 border-teal-100 p-2 transition-colors hover:border-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">
                  <ToyPicture toy={item} />
                </button>
              ))}
            </div>
            {attempt > 0 && <p role="status" className="font-medium">Попробуй ещё раз.</p>}
            <Button variant="ghost" onClick={() => setShowWords(!showWords)} aria-expanded={showWords}>
              {showWords ? "Скрыть текст задания" : "Показать текст задания"}
            </Button>
            {showWords && <p className="text-lg font-semibold">{toy.request}</p>}
          </div>
        )}

        {stage === "say" && (
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold text-teal-800">Скажи, если хочешь · {index + 1} из {TOYS_ROUNDS.length}</p>
            <ToyPicture toy={round.target} />
            <h2 className="text-3xl font-extrabold">{toy.phrase}</h2>
            <Button variant="outline" onClick={() => void speak(toy.phrase)} className="gap-2">
              <Volume2 className="h-5 w-5" /> Послушать ещё
            </Button>
            <Button size="lg" className="w-full gap-2" onClick={nextRound}>
              {index + 1 === TOYS_ROUNDS.length ? "Закончить урок" : "Дальше"} <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}

        {stage === "done" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold">Спасибо за игру!</h2>
            <p>Сегодня потренировали слова: мяч, кукла, мишка.</p>
            <div className="rounded-2xl bg-teal-50 p-4 text-teal-950">
              <h3 className="font-bold">Игра дома</h3>
              <p className="mt-1 text-sm leading-relaxed">{TOYS_HOME_GAME}</p>
            </div>
            {saveStatus === "saving" && <p role="status">Сохраняем результат…</p>}
            {saveStatus === "saved" && <p role="status">Результат в кабинете родителя.</p>}
            {saveStatus === "error" && (
              <div role="status" className="space-y-2">
                <p>Не удалось отправить результат.</p>
                <Button variant="outline" onClick={() => void save()}>Повторить отправку</Button>
              </div>
            )}
            <Button size="lg" disabled={saveStatus === "saving"} className="w-full" onClick={() => setPlayingPositions(true)}>Где мишка?</Button>
            <Button variant="outline" onClick={start} disabled={saveStatus === "saving"} className="w-full">Сыграть ещё раз</Button>
          </div>
        )}
      </Card>
    </>
  );
}
