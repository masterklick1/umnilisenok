import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logChildActivity } from "@/lib/activity-log";
import { addUsedSeconds, getLimitMinutes, getUsedSeconds, isLoginNotifyEnabled } from "@/lib/screen-time";
import { Button } from "@/components/ui/button";

// Pages where the child's learning time is counted and limited.
const EXEMPT = ["/auth", "/parent", "/settings", "/join", "/delete-account"];

export function ScreenTimeGuard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState(false);
  const exempt = EXEMPT.some((p) => location.pathname.startsWith(p));

  // Login notification: once per app session
  useEffect(() => {
    if (!user?.id || !isLoginNotifyEnabled()) return;
    if (sessionStorage.getItem("loginLogged")) return;
    sessionStorage.setItem("loginLogged", "1");
    void logChildActivity(user.id, "app_login", location.pathname, {
      at: new Date().toISOString(),
      used_today_min: Math.round(getUsedSeconds() / 60),
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const check = () => {
      const limit = getLimitMinutes();
      setBlocked(limit > 0 && getUsedSeconds() >= limit * 60);
    };
    check();
    window.addEventListener("screentime-change", check);
    const id = window.setInterval(() => {
      if (!user?.id || exempt || document.hidden) return check();
      addUsedSeconds(15);
      const limit = getLimitMinutes();
      const wasBlocked = limit > 0 && getUsedSeconds() - 15 >= limit * 60;
      check();
      if (limit > 0 && !wasBlocked && getUsedSeconds() >= limit * 60) {
        void logChildActivity(user.id, "time_limit_reached", location.pathname, { limit_min: limit });
      }
    }, 15000);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("screentime-change", check);
    };
  }, [user?.id, exempt, location.pathname]);

  if (!blocked || exempt || !user) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background/95 p-6 text-center backdrop-blur">
      <div className="text-8xl animate-bounce-gentle">🦊💤</div>
      <h2 className="text-3xl font-extrabold text-gradient">Время на сегодня закончилось!</h2>
      <p className="max-w-sm text-lg text-muted-foreground">
        Лисёнок устал и хочет отдохнуть. Поиграй с игрушками, а завтра продолжим учиться!
      </p>
      <Button variant="outline" onClick={() => navigate("/settings")}>Для родителей</Button>
    </div>
  );
}
