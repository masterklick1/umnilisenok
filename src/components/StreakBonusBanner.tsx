import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivityChildId } from "@/lib/activity-log";
import { isDemoUserId } from "@/lib/demo-session";
import { speak } from "@/lib/sound";

type Result = { streak: number; bonus: number; claimed: boolean };

const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "день" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "дня" : "дней");

/** Бонус за дни подряд: начисляется раз в день, звёзды тратятся в домике. */
export const StreakBonusBanner = () => {
  const navigate = useNavigate();
  const [res, setRes] = useState<Result | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const childId = getActivityChildId(data.session?.user.id);
      if (!childId || isDemoUserId(childId)) return;
      const { data: rows, error } = await supabase.rpc("claim_streak_bonus", { _child_id: childId });
      if (error || !active) return;
      const r = (rows as Result[] | null)?.[0];
      if (!r) return;
      setRes(r);
      if (r.claimed && r.bonus > 0) {
        try { speak(`Молодец! ${r.streak} ${plural(r.streak)} подряд! Лови ${r.bonus} звёзд!`); } catch { /* ignore */ }
        window.dispatchEvent(new Event("progress-updated"));
      }
    })();
    return () => { active = false; };
  }, []);

  if (!res || res.streak < 1) return null;

  if (res.claimed && res.bonus > 0 && open) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-6" onClick={() => setOpen(false)}>
        <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
          <div className="text-6xl">🔥</div>
          <h2 className="mt-2 text-2xl font-bold text-foreground">{res.streak} {plural(res.streak)} подряд!</h2>
          <p className="mt-2 text-lg text-muted-foreground">Бонус: <span className="font-bold text-primary">+{res.bonus} ⭐</span></p>
          <p className="mt-1 text-sm text-muted-foreground">Потрать звёзды в домике на мебель и питомцев</p>
          <div className="mt-5 flex gap-2">
            <button className="flex-1 rounded-2xl bg-muted py-3 font-semibold text-foreground" onClick={() => setOpen(false)}>Учиться</button>
            <button className="flex-1 rounded-2xl bg-primary py-3 font-semibold text-primary-foreground" onClick={() => navigate("/home")}>🏠 В домик</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full bg-accent/60 px-4 py-1.5 text-sm font-semibold text-accent-foreground">
      🔥 {res.streak} {plural(res.streak)} подряд
      {res.streak < 2 ? " · завтра будет бонус ⭐" : ""}
    </div>
  );
};
