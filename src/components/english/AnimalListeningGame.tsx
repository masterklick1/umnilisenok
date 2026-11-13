import { useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { recordLearned } from "@/lib/learning-progress";
import { speakEnglish } from "@/lib/sound";

type Animal = { word: string; translation: string; emoji: string };
type Round = { answer: Animal; choices: Animal[] };

function shuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const pick = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[pick]] = [shuffled[pick], shuffled[index]];
  }
  return shuffled;
}

function makeRounds(animals: readonly Animal[]): Round[] {
  return shuffle(animals).map((answer) => {
    const distractors = shuffle(animals.filter((animal) => animal !== answer)).slice(0, 2);
    return { answer, choices: shuffle([answer, ...distractors]) };
  });
}

export function AnimalListeningGame({ animals, onBack }: { animals: readonly Animal[]; onBack: () => void }) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [showWord, setShowWord] = useState(false);
  const [score, setScore] = useState(0);

  const round = rounds[index];
  const finished = rounds.length > 0 && !round;
  const revealed = missed.length === 2;
  const locked = solved || revealed;
  const playWord = (animal: Animal) => void speakEnglish(animal.word, 0.8);

  const start = () => {
    const next = makeRounds(animals);
    setRounds(next);
    setIndex(0);
    setMissed([]);
    setSolved(false);
    setShowWord(false);
    setScore(0);
    if (next[0]) playWord(next[0].answer);
  };

  const pick = (animal: Animal) => {
    if (!round || locked || missed.includes(animal.word)) return;
    if (animal === round.answer) {
      setSolved(true);
      setScore((value) => value + 1);
      if (!showWord) void recordLearned("english", animal.word);
    } else {
      setMissed([...missed, animal.word]);
    }
  };

  const advance = () => {
    const next = rounds[index + 1];
    setIndex(index + 1);
    setMissed([]);
    setSolved(false);
    setShowWord(false);
    if (next) playWord(next.answer);
  };

  return (
    <Card className="space-y-5 rounded-3xl border-amber-200 bg-white p-4 text-center text-slate-900 sm:p-8">
      <h2 className="text-2xl font-extrabold">Послушай и выбери</h2>
      {!round && (
        <>
          <p className="text-slate-600">
            {finished ? `Ты нашёл ${score} из ${rounds.length} животных.` : "Послушай английское слово и покажи нужное животное."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={start}><Volume2 className="mr-2 h-5 w-5" />{finished ? "Сыграть ещё раз" : "Начать игру"}</Button>
            <Button variant="outline" onClick={onBack}>К карточкам</Button>
          </div>
        </>
      )}

      {round && (
        <>
          <p className="text-sm font-semibold text-slate-600">Задание {index + 1} из {rounds.length}</p>
          <Button size="lg" onClick={() => playWord(round.answer)}>
            <Volume2 className="mr-2 h-5 w-5" /> Послушать слово
          </Button>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {round.choices.map((animal) => (
              <button
                key={animal.word}
                type="button"
                aria-label={animal.translation}
                disabled={locked || missed.includes(animal.word)}
                onClick={() => pick(animal)}
                className={`flex aspect-square items-center justify-center rounded-2xl border-2 text-4xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700 sm:text-6xl ${
                  locked && animal === round.answer
                    ? "border-green-500 bg-green-50"
                    : "border-amber-200 bg-amber-50 enabled:hover:border-amber-500 disabled:opacity-50"
                }`}
              >
                <span aria-hidden="true">{animal.emoji}</span>
              </button>
            ))}
          </div>
          {locked ? (
            <p role="status" className="font-semibold">
              {solved ? "Правильно!" : "Вот правильный ответ:"} <span lang="en">{round.answer.word}</span>
            </p>
          ) : (
            <>
              {missed.length > 0 && <p role="status" className="font-semibold">Попробуй ещё раз.</p>}
              <Button variant="ghost" onClick={() => setShowWord(true)} disabled={showWord}>Показать слово</Button>
              {showWord && <p lang="en" className="font-semibold">{round.answer.word}</p>}
            </>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={onBack}>К карточкам</Button>
            {locked && <Button onClick={advance}>{index + 1 === rounds.length ? "Посмотреть итог" : "Дальше"}</Button>}
          </div>
        </>
      )}
    </Card>
  );
}
