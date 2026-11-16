import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { Clock, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  getLimitMinutes, getUsedSeconds, isLoginNotifyEnabled, resetUsageToday,
  setLimitMinutes, setLoginNotifyEnabled,
} from "@/lib/screen-time";

const OPTIONS = [0, 15, 30, 45, 60, 90, 120];

export function ScreenTimeSettings() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [limit, setLimit] = useState(getLimitMinutes());
  const [used, setUsed] = useState(Math.round(getUsedSeconds() / 60));
  const [notify, setNotify] = useState(isLoginNotifyEnabled());

  useEffect(() => {
    const id = window.setInterval(() => setUsed(Math.round(getUsedSeconds() / 60)), 15000);
    return () => window.clearInterval(id);
  }, []);

  const pick = (m: number) => {
    setLimit(m);
    setLimitMinutes(m);
    toast({ title: m ? t(`Лимит: ${m} мин в день`, `Daily limit: ${m} min`) : t("Лимит времени выключен", "Time limit turned off") });
  };

  return (
    <>
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-2 font-semibold">
          <Clock className="w-5 h-5 text-primary" /> {t("Ограничение времени", "Screen time limit")}
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {t("Сколько минут в день ребёнок может заниматься. Сегодня:", "Set how many minutes your child can use the app each day. Today:")} <b>{used} {t("мин", "min")}</b>
          {limit > 0 && t(` из ${limit}`, ` of ${limit}`)}
        </p>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((m) => (
            <Button key={m} size="sm" variant={limit === m ? "default" : "outline"} onClick={() => pick(m)}>
              {m === 0 ? t("Без лимита", "No limit") : t(`${m} мин`, `${m} min`)}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost" size="sm" className="mt-3"
          onClick={() => { resetUsageToday(); setUsed(0); toast({ title: t("Время на сегодня сброшено", "Today’s screen time was reset") }); }}
        >
          {t("Дать ещё время сегодня", "Give more time today")}
        </Button>
      </Card>

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Bell className="w-5 h-5 text-primary" /> {t("Уведомления о входе", "Activity notifications")}
          </div>
          <Switch
            checked={notify}
            onCheckedChange={(v) => { setNotify(v); setLoginNotifyEnabled(v); }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("Когда ребёнок открывает приложение или заканчивается время, это появится в активности в родительском кабинете.", "See when your child opens the app or reaches the time limit in the parent dashboard.")}
        </p>
      </Card>
    </>
  );
}
