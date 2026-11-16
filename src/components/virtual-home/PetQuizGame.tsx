import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import { useVirtualHome } from "@/hooks/useVirtualHome";
import { useUserProgress } from "@/hooks/useUserProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Volume2, Star, Trophy, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { speak } from "@/lib/sound";

interface Question {
  id: number;
  text: string;
  options: string[];
  correctIndex: number;
}

interface PetQuizGameProps {
  onClose?: () => void;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Сколько будет 5 плюс 3?",
    options: ["7", "8", "9", "6"],
    correctIndex: 1,
  },
  {
    id: 2,
    text: "Как переводится слово 'Cat' с английского языка?",
    options: ["Собака", "Кот", "Птица", "Хомяк"],
    correctIndex: 1,
  },
  {
    id: 3,
    text: "Какого цвета трава летом?",
    options: ["Синяя", "Красная", "Зелёная", "Жёлтая"],
    correctIndex: 2,
  },
  {
    id: 4,
    text: "Сколько дней в одной неделе?",
    options: ["5", "6", "7", "10"],
    correctIndex: 2,
  },
  {
    id: 5,
    text: "Сколько будет 10 минус 4?",
    options: ["6", "5", "7", "4"],
    correctIndex: 0,
  },
];

export const PetQuizGame = ({ onClose }: PetQuizGameProps) => {
  const { t, label, language } = useLanguage();
  const { userPet, playWithPet } = useVirtualHome() as any;
  const { refetch: refetchProgress } = useUserProgress();
  const { toast } = useToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  const question = QUESTIONS[currentQuestionIndex];
  const currentQuestion = { ...question, text: label(question.text), options: question.options.map(label) };

  const speakText = (text: string) => {
    void speak(text, language === "en" ? "en-US" : "ru-RU");
  };

  useEffect(() => {
    if (currentQuestion && !isGameOver) {
      speakText(currentQuestion.text);
    }
  }, [currentQuestionIndex, isGameOver, language]);

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;

    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === currentQuestion.correctIndex;

    if (isCorrect) {
      setScore((prev) => prev + 1);
      speakText(t("Правильно! Молодец!", "That’s right! Well done!"));
      toast({
        title: t("Отлично! 🎉", "Well done! 🎉"),
        description: t("Правильный ответ!", "Correct answer!"),
      });
    } else {
      speakText(t("Ой, не совсем так. Давай дальше!", "Almost! Let’s keep going."));
      toast({
        title: t("Не угадал 😅", "Not quite 😅"),
        description: t(`Правильный ответ: ${currentQuestion.options[currentQuestion.correctIndex]}`, `Correct answer: ${currentQuestion.options[currentQuestion.correctIndex]}`),
        variant: "destructive",
      });
    }

    setTimeout(() => {
      if (currentQuestionIndex + 1 < QUESTIONS.length) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        finishGame(isCorrect ? score + 1 : score);
      }
    }, 1800);
  };

  const finishGame = async (finalScore: number) => {
    setIsGameOver(true);

    if (finalScore > 0 && userPet) {
      if (typeof playWithPet === "function") {
        await playWithPet();
      }
      if (typeof refetchProgress === "function") {
        await refetchProgress();
      }
      speakText(t(`Ура! Вы ответили правильно на ${finalScore} вопросов! ${userPet.pet_name} очень рад!`, `Hooray! You got ${finalScore} questions right. ${userPet.pet_name} is happy!`));
    } else {
      speakText(t("Игра окончена. Попробуй ещё раз!", "Game over. Try again!"));
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsGameOver(false);
  };

  if (!userPet) {
    return (
      <Card className="text-center p-6">
        <CardTitle>{t("У вас пока нет питомца", "You don’t have a pet yet")}</CardTitle>
        <CardDescription className="mt-2">{t("Заведите питомца в магазине, чтобы играть с ним!", "Adopt a pet in the shop to play together!")}</CardDescription>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto border-2 border-indigo-100 shadow-md">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-4xl">{userPet.pets?.icon || "🐾"}</span>
            <div>
              <CardTitle className="text-lg font-bold text-indigo-900">
                {t("Учись с", "Learn with")} {userPet.pet_name}
              </CardTitle>
              <CardDescription className="text-xs text-indigo-600">
                {t("Слушай вопрос и выбирай правильный ответ!", "Listen to the question and choose the right answer!")}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm border border-indigo-100 text-sm font-bold text-amber-600">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            {score} / {QUESTIONS.length}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {!isGameOver ? (
          <div className="space-y-6">
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-gray-800 flex-1">
                {currentQuestion.text}
              </p>
              <Button
                variant="outline"
                size="icon"
                onClick={() => speakText(currentQuestion.text)}
                className="shrink-0 bg-white hover:bg-indigo-100 text-indigo-600 border-indigo-200"
                title={t("Озвучить ещё раз", "Listen again")}
              >
                <Volume2 className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options.map((option, idx) => {
                let btnStyle = "bg-white hover:bg-indigo-50 border-gray-200 text-gray-700";

                if (isAnswered) {
                  if (idx === currentQuestion.correctIndex) {
                    btnStyle = "bg-green-500 hover:bg-green-600 text-white border-green-600";
                  } else if (idx === selectedOption) {
                    btnStyle = "bg-red-500 hover:bg-red-600 text-white border-red-600";
                  }
                }

                return (
                  <Button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswered}
                    className={`h-14 text-base font-medium rounded-xl border transition-all ${btnStyle}`}
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="inline-flex p-4 bg-yellow-100 rounded-full text-amber-600 mb-2">
              <Trophy className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{t("Отличная работа!", "Great job!")}</h3>
            <p className="text-gray-600">
              {t("Ты ответил правильно на", "You got")} <span className="font-bold text-indigo-600">{score}</span> {t("из", "of")} {QUESTIONS.length} {t("вопросов.", "questions.")}
            </p>
            <p className="text-sm text-emerald-600 font-medium">
              {userPet.pet_name} {t("стал счастливее и получил новые знания! ✨", "is happier and learned something new! ✨")}
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                onClick={handleRestart}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <RotateCcw className="w-4 h-4" /> {t("Играть ещё раз", "Play again")}
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  {t("Завершить", "End game")}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
