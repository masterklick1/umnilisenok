import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOYS, TOYS_HOME_GAME, TOYS_LESSON_EVENT, toysLessonResult } from "@/lib/toys-lesson";

type Activity = {
  child_id: string;
  activity_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export function ToysLessonReport({ childId, activities }: { childId: string; activities: Activity[] }) {
  const recent = activities
    .filter((activity) => activity.child_id === childId && activity.activity_type === TOYS_LESSON_EVENT)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const result = toysLessonResult.safeParse(recent?.details);
  if (!recent || !result.success) return null;
  const date = new Date(recent.created_at);
  const recognized = result.data.recognized.map((toy) => TOYS[toy].word).join(", ");
  const practice = result.data.practice.map((toy) => TOYS[toy].word).join(", ");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Русский через игру · Мои игрушки</CardTitle>
        {Number.isFinite(date.getTime()) && (
          <p className="text-sm text-muted-foreground">{format(date, "d MMMM, HH:mm", { locale: ru })}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {recognized && <p><strong>Нашёл по просьбе</strong> · {recognized}</p>}
        {practice && <p><strong>Стоит повторить</strong> · {practice}</p>}
        <div className="rounded-xl bg-muted p-3">
          <p className="font-semibold">Игра дома</p>
          <p className="mt-1">{TOYS_HOME_GAME}</p>
        </div>
      </CardContent>
    </Card>
  );
}
