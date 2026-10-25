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
    toast({ title: m ? `Лимит: ${m} мин в день` : "Лимит времени выключен" });
  };

  return (
    <>
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-2 font-semibold">
          <Clock className="w-5 h-5 text-primary" /> Ограничение времени
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Сколько минут в день ребёнок может заниматься. Сегодня: <b>{used} мин</b>
          {limit > 0 && ` из ${limit}`}
        </p>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((m) => (
            <Button key={m} size="sm" variant={limit === m ? "default" : "outline"} onClick={() => pick(m)}>
              {m === 0 ? "Без лимита" : `${m} мин`}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost" size="sm" className="mt-3"
          onClick={() => { resetUsageToday(); setUsed(0); toast({ title: "Время на сегодня сброшено" }); }}
        >
          Дать ещё время сегодня
        </Button>
      </Card>

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Bell className="w-5 h-5 text-primary" /> Уведомления о входе
          </div>
          <Switch
            checked={notify}
            onCheckedChange={(v) => { setNotify(v); setLoginNotifyEnabled(v); }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Когда ребёнок открывает приложение или заканчивается время, это появится в активности в родительском кабинете.
        </p>
      </Card>
    </>
  );
}
