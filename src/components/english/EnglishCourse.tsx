import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Headphones, Lock, RotateCcw, Volume2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ENGLISH_COURSE_LESSONS as LESSONS, ENGLISH_COURSE_UNITS as UNITS } from "@/lib/english-course";
import { speakEnglish, stopSpeech } from "@/lib/sound";

const WORDS_PER_LESSON = 3;
const wordId = z.number().int().min(0).max(WORDS_PER_LESSON - 1);
const wordIds = z.array(wordId).max(WORDS_PER_LESSON);
const courseSchema = z.object({
  completed: z.number().int().min(0).max(LESSONS.length),
  run: z.object({
    lesson: z.number().int().min(0).max(LESSONS.length - 1),
    order: wordIds.min(1),
    step: z.number().int().min(0).max(WORDS_PER_LESSON),
    missed: wordIds,
    wrong: wordIds,
    solved: z.boolean(),
    review: z.boolean(),
  }).nullable(),
}).refine(({ run, completed }) => !run || (run.lesson <= completed && run.step <= run.order.length));

type Course = z.infer<typeof courseSchema>;
type Run = NonNullable<Course["run"]>;

function loadCourse(key: string): Course {
  try {
    const saved = courseSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? "null"));
    if (saved.success) return saved.data;
  } catch {
    // Keep the course playable when local storage is unavailable.
  }
  return { completed: 0, run: null };
}

function questionFor(run: Run) {
  const lesson = LESSONS[run.lesson];
  return lesson.prompt(lesson.words[run.order[run.step]]);
}

export function EnglishCourse({ learner }: { learner: string }) {
  const { t } = useLanguage();
  // The expanded course keeps the original lesson order and storage key.
  const storageKey = `fox-english-animals-v1:${learner}`;
  const [course, setCourse] = useState(() => loadCourse(storageKey));
  const [showLesson, setShowLesson] = useState(false);
  const { completed, run } = course;
  const lesson = run && LESSONS[run.lesson];
  const done = !!run && run.step === run.order.length;
  const target = run && !done ? run.order[run.step] : null;
  const answer = lesson && target !== null ? lesson.reply(lesson.words[target]) : "";
  const choiceOffset = run && lesson ? (run.step * 2 + run.lesson + lesson.unitIndex) % WORDS_PER_LESSON : 0;
  const choices = lesson?.words.map((_, index) => (index + choiceOffset) % WORDS_PER_LESSON) ?? [];
  const nextUnitIndex = LESSONS[Math.min(completed, LESSONS.length - 1)].unitIndex;
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number | null>(null);
  const unitIndex = selectedUnitIndex ?? (lesson && !done ? lesson.unitIndex : nextUnitIndex);
  const unit = UNITS[unitIndex];

  useEffect(() => () => { void stopSpeech(); }, []);

  const save = (next: Course) => {
    setCourse(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // The current lesson can still be finished.
    }
  };

  const start = (lessonIndex: number, reviewOrder?: number[]) => {
    const next: Run = {
      lesson: lessonIndex, order: reviewOrder ?? LESSONS[lessonIndex].order,
      step: 0, missed: [], wrong: [], solved: false, review: !!reviewOrder,
    };
    save({ completed, run: next });
    setSelectedUnitIndex(null);
    setShowLesson(true);
    void speakEnglish(questionFor(next));
  };

  const openLesson = (lessonIndex: number) => {
    if (run?.lesson === lessonIndex && !done) {
      setShowLesson(true);
      void speakEnglish(run.solved ? answer : questionFor(run));
    } else {
      start(lessonIndex);
    }
  };

  const choose = (choice: number) => {
    if (!run || target === null || run.solved || run.wrong.includes(choice)) return;
    if (choice === target) {
      save({ completed, run: { ...run, solved: true } });
      void speakEnglish(`Yes! ${answer}`);
      return;
    }
    const missed = run.missed.includes(target) ? run.missed : [...run.missed, target];
    save({ completed, run: { ...run, missed, wrong: [...run.wrong, choice] } });
    void speakEnglish(questionFor(run));
  };

  const advance = () => {
    if (!run?.solved || done) return;
    const next = { ...run, step: run.step + 1, solved: false, wrong: [] };
    if (next.step === next.order.length) {
      save({ completed: Math.max(completed, run.lesson + 1), run: next });
      void speakEnglish("Well done!");
    } else {
      save({ completed, run: next });
      void speakEnglish(questionFor(next));
    }
  };

  const goToRoute = () => {
    void stopSpeech();
    setSelectedUnitIndex(null);
    setShowLesson(false);
  };

  if (showLesson && run && lesson) {
    return (
      <Card className="space-y-5 rounded-3xl border-teal-200 p-4 text-center sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-left">
          <Button variant="ghost" onClick={goToRoute}><ArrowLeft className="mr-2 h-4 w-4" /> {t("К маршруту", "Back to the course")}</Button>
          <span className="text-sm font-semibold text-muted-foreground">{run.review ? t("Повторение", "Review") : lesson.title}</span>
        </div>
        <div role="progressbar" aria-label={t("Прогресс урока", "Lesson progress")} aria-valuemin={0} aria-valuemax={run.order.length}
          aria-valuenow={run.step + Number(run.solved)} className="h-2 overflow-hidden rounded-full bg-teal-100">
          <div className="h-full rounded-full bg-teal-600" style={{ width: `${(run.step + Number(run.solved)) / run.order.length * 100}%` }} />
        </div>
        {done ? (
          <div className="space-y-3">
            <h2 className="text-2xl font-extrabold">{run.review ? t("Повторение завершено!", "Review complete!") : t("Урок пройден!", "Lesson complete!")}</h2>
            {run.missed.length > 0 && (
              <Button size="lg" variant="outline" onClick={() => start(run.lesson, run.missed)}>
                <RotateCcw className="mr-2 h-5 w-5" /> {t("Повторить сложные слова", "Review tricky words")}
              </Button>
            )}
            {completed < LESSONS.length && (
              <Button size="lg" className="mx-auto flex" onClick={() => start(completed)}>{t("Следующий урок", "Next lesson")} <ArrowRight className="ml-2 h-5 w-5" /></Button>
            )}
            {completed === LESSONS.length && <p className="font-semibold text-teal-800">{t("Все уроки курса пройдены!", "You’ve finished the course!")}</p>}
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-extrabold">{run.solved && lesson.repeat ? t("Повтори за Лисёнком", "Repeat after Little Fox") : t("Послушай и выбери", "Listen and choose")}</h2>
            <Button size="lg" variant="outline" className="min-h-14 text-lg"
              onClick={() => void speakEnglish(run.solved ? answer : questionFor(run))}>
              <Volume2 className="mr-2 h-6 w-6" /> {t("Послушать ещё", "Listen again")}
            </Button>
            <div className="mx-auto grid max-w-lg grid-cols-3 gap-2 sm:gap-4">
              {choices.map((index) => {
                const word = lesson.words[index];
                return (
                  <button type="button" key={word.word} aria-label={t(word.translation, word.word)}
                    disabled={run.solved || run.wrong.includes(index)} onClick={() => choose(index)}
                    className={`aspect-square min-w-0 rounded-2xl border-2 focus-visible:outline focus-visible:outline-primary ${word.emoji.startsWith("●") ? "text-lg tracking-wide text-teal-800 sm:text-3xl" : "text-4xl sm:text-6xl"} ${
                      run.solved && index === target ? "border-green-600 bg-green-50" : "border-teal-100 bg-teal-50 enabled:hover:border-teal-500 disabled:opacity-40"
                    }`}>
                    <span aria-hidden="true">{word.emoji}</span>
                  </button>
                );
              })}
            </div>
            {run.solved && (
              <div className="space-y-3">
                <p role="status" lang="en" className="text-xl font-bold text-teal-800">{answer}</p>
                <Button size="lg" className="min-h-14 w-full max-w-xs text-lg" onClick={advance}>{t("Дальше", "Next")} <ArrowRight className="ml-2 h-5 w-5" /></Button>
              </div>
            )}
            {!run.solved && run.wrong.length > 0 && <p role="status" className="font-semibold">{t("Послушай ещё раз и попробуй выбрать другую картинку.", "Listen again and try another picture.")}</p>}
          </>
        )}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-3xl border-teal-200">
      <div className="space-y-3 bg-teal-950 p-5 text-white sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-teal-200"><Headphones className="h-4 w-4" /> {t("Маршрут английского", "English course")}</div>
        <h2 className="text-2xl font-extrabold sm:text-3xl">{t("Английский по шагам", "English step by step")}</h2>
        <p className="text-sm text-teal-100">Пройдено {completed} из {LESSONS.length}</p>
        {run && !done ? (
          <Button className="min-h-12 bg-lime-300 font-bold text-teal-950 hover:bg-lime-200" onClick={() => openLesson(run.lesson)}>
            {t("Продолжить урок", "Continue lesson")} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : completed < LESSONS.length ? (
          <Button className="min-h-12 bg-lime-300 font-bold text-teal-950 hover:bg-lime-200" onClick={() => openLesson(completed)}>
            {completed ? t("Продолжить урок", "Continue lesson") : t("Начать курс", "Start the course")} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : null}
        {run && done && run.missed.length > 0 && (
          <Button variant="outline" className="min-h-12 bg-transparent text-white hover:bg-teal-800 hover:text-white" onClick={() => start(run.lesson, run.missed)}>
            <RotateCcw className="mr-2 h-4 w-4" /> {t("Повторить сложные слова", "Review tricky words")}
          </Button>
        )}
      </div>
      <div className="space-y-2 border-b border-teal-100 bg-teal-50 p-4 sm:p-5">
        <label htmlFor="english-course-unit" className="block text-sm font-semibold text-teal-950">{t("Темы курса", "Course topics")}</label>
        <select id="english-course-unit" value={unitIndex} onChange={(event) => setSelectedUnitIndex(Number(event.target.value))}
          className="min-h-12 w-full rounded-xl border border-teal-200 bg-white px-3 text-base font-semibold text-teal-950">
          {UNITS.map((item, index) => {
            const count = Math.max(0, Math.min(item.size, completed - item.firstLesson));
            return <option key={item.label} value={index}>{item.icon} {t(item.label, item.title)} · {count}/{item.size}</option>;
          })}
        </select>
      </div>
      <ol className="space-y-2 bg-white p-4 sm:p-5" start={unit.firstLesson + 1}>
        {LESSONS.slice(unit.firstLesson, unit.firstLesson + unit.size).map(({ title, description, descriptionEn }, offset) => {
          const index = unit.firstLesson + offset;
          return (
            <li key={index}>
              <button type="button" disabled={index > completed} onClick={() => openLesson(index)}
                className="flex w-full items-center gap-3 rounded-2xl border border-teal-100 px-3 py-2 text-left text-slate-900 enabled:hover:border-teal-500 disabled:opacity-55">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-900">
                  {index < completed ? <Check className="h-5 w-5" /> : index > completed ? <Lock className="h-4 w-4" /> : index + 1}
                </span>
                <span>
                  <span lang="en" className="block font-bold">{title}</span>
                  <span className="block text-sm text-slate-600">{t(description, descriptionEn)}{index < completed ? t(" · пройден", " · completed") : ""}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
