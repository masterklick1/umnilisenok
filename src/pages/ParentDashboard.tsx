import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParentalControl } from "@/hooks/useParentalControl";
import { useAuth } from "@/contexts/AuthContext";
import { CreateChildForm } from "@/components/parental/CreateChildForm";
import { ChildCard } from "@/components/parental/ChildCard";
import { ActivityMirror } from "@/components/parental/ActivityMirror";
import { AIRecommendations } from "@/components/parental/AIRecommendations";
import { GamesList } from "@/components/parental/GamesList";
import { SafetyPanel } from "@/components/parental/SafetyPanel";
import { InvitePanel } from "@/components/parental/InvitePanel";
import { ArrowLeft, Users, Eye, Brain, Gamepad2, LogOut, Shield, Link2, Bell, BellOff, RefreshCw, CheckCircle2, XCircle, House } from "lucide-react";
import { ChildRoomViewer } from "@/components/parental/ChildRoomViewer";
import { MonitoringPanel } from "@/components/parental/MonitoringPanel";
import { MonitoringNotificationSettings, loadMonitoringPrefs, shouldNotify, type MonitoringNotifPrefs } from "@/components/parental/MonitoringNotificationSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { isPushSupported, getPushPermission, subscribeToPush, ensureServiceWorker, getPushStatus, unsubscribeFromPush, type PushStatus } from "@/lib/push";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const {
    children,
    loading,
    selectedChild,
    setSelectedChild,
    createChildAccount,
    childActivities,
    childAnalysis,
    analyzeChild,
    analyzingChild,
    gameSessions,
    createGameSession,
  } = useParentalControl();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();
  const [pushPerm, setPushPerm] = useState<NotificationPermission | "unsupported">(
    isPushSupported() ? getPushPermission() : "unsupported"
  );
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<MonitoringNotifPrefs>(loadMonitoringPrefs());

  useEffect(() => {
    const handler = (e: Event) => setNotifPrefs((e as CustomEvent).detail);
    window.addEventListener("monitoring-prefs-changed", handler);
    return () => window.removeEventListener("monitoring-prefs-changed", handler);
  }, []);

  const refreshPushStatus = async () => {
    if (!user?.id) return;
    const s = await getPushStatus(user.id);
    setPushStatus(s);
    setPushPerm(s.permission);
  };

  // Auto-register SW + try to silently reuse subscription
  useEffect(() => {
    if (!user?.id || !isPushSupported()) return;
    (async () => {
      await ensureServiceWorker();
      if (Notification.permission === "granted") {
        await subscribeToPush(user.id).catch(() => {});
      }
      await refreshPushStatus();
    })();
  }, [user?.id]);

  // Periodic push status re-sync every 5 minutes (and on tab focus)
  useEffect(() => {
    if (!user?.id || !isPushSupported()) return;

    const tick = async () => {
      if (Notification.permission === "granted") {
        // Re-upsert keeps last_synced_at fresh and re-binds endpoint to current user
        await subscribeToPush(user.id).catch(() => {});
      }
      await refreshPushStatus();
    };

    const interval = window.setInterval(tick, 5 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.id]);

  const enablePush = async () => {
    if (!user?.id) return;
    const ok = await subscribeToPush(user.id);
    await refreshPushStatus();
    toast({
      title: ok ? "Уведомления включены" : "Не удалось включить уведомления",
      description: ok
        ? "Вы будете получать оповещения о геозоне даже вне приложения."
        : "Проверьте разрешения браузера для этого сайта.",
      variant: ok ? "default" : "destructive",
    });
  };

  const disablePush = async () => {
    await unsubscribeFromPush();
    await refreshPushStatus();
    toast({ title: "Уведомления отключены на этом устройстве" });
  };

  const resyncPush = async () => {
    if (!user?.id) return;
    const ok = await subscribeToPush(user.id);
    await refreshPushStatus();
    toast({
      title: ok ? "Подписка обновлена" : "Не удалось обновить подписку",
      variant: ok ? "default" : "destructive",
    });
  };

  // Realtime SOS notification across all linked children
  useEffect(() => {
    const childIds = children.map((c) => c.child_id);
    if (childIds.length === 0) return;

    const channel = supabase
      .channel("parent-sos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sos_alerts" },
        (payload) => {
          const a = payload.new as { child_id: string };
          if (!childIds.includes(a.child_id)) return;
          const child = children.find((c) => c.child_id === a.child_id);
          toast({
            title: "🚨 SOS!",
            description: `${child?.first_name || "Ребёнок"} нажал кнопку помощи`,
            variant: "destructive",
            duration: 60000,
            action: (
              <ToastAction altText="Открыть" onClick={() => setSelectedChild(a.child_id)}>
                Открыть
              </ToastAction>
            ),
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "geofence_events" },
        (payload) => {
          const ev = payload.new as { child_id: string; event_type: string; distance_m: number | null };
          if (!childIds.includes(ev.child_id)) return;
          const child = children.find((c) => c.child_id === ev.child_id);
          const isExit = ev.event_type === "exit";
          toast({
            title: isExit ? "⚠️ Выход из безопасной зоны" : "✅ Возврат в зону",
            description: `${child?.first_name || "Ребёнок"}${ev.distance_m ? ` · ${Math.round(ev.distance_m)}м от центра` : ""}`,
            variant: isExit ? "destructive" : "default",
            duration: 30000,
            action: (
              <ToastAction altText="Открыть" onClick={() => setSelectedChild(ev.child_id)}>
                Открыть
              </ToastAction>
            ),
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "monitoring_requests" },
        (payload) => {
          const r = payload.new as { child_id: string; parent_id: string; request_type: string; status: string };
          if (!childIds.includes(r.child_id)) return;
          if (r.status !== "fulfilled" && r.status !== "failed") return;
          if (!shouldNotify(notifPrefs, r.request_type, r.status)) return;
          const child = children.find((c) => c.child_id === r.child_id);
          const typeLabel = r.request_type === "photo" ? "фото" : r.request_type === "audio" ? "звук" : "локацию";
          const ok = r.status === "fulfilled";
          toast({
            title: ok ? `✅ Получен ответ: ${typeLabel}` : `❌ Ошибка запроса: ${typeLabel}`,
            description: `${child?.first_name || "Ребёнок"}${ok ? " прислал данные" : " не смог выполнить запрос"}`,
            variant: ok ? "default" : "destructive",
            duration: 20000,
            action: (
              <ToastAction altText="Открыть" onClick={() => setSelectedChild(r.child_id)}>
                Открыть
              </ToastAction>
            ),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [children, setSelectedChild, toast, notifPrefs]);

  // Timeout watcher: notify when a child hasn't responded within N minutes
  useEffect(() => {
    const childIds = children.map((c) => c.child_id);
    if (childIds.length === 0) return;
    if (!notifPrefs.timeoutMinutes || notifPrefs.timeoutMinutes <= 0) return;

    const notified = new Set<string>();

    const check = async () => {
      const thresholdMs = notifPrefs.timeoutMinutes * 60 * 1000;
      const cutoff = new Date(Date.now() - thresholdMs).toISOString();
      const { data } = await supabase
        .from("monitoring_requests")
        .select("id, child_id, request_type, status, created_at")
        .in("child_id", childIds)
        .eq("status", "pending")
        .lt("created_at", cutoff);

      (data || []).forEach((r: any) => {
        if (notified.has(r.id)) return;
        if (!shouldNotify(notifPrefs, r.request_type, "failed")) return;
        notified.add(r.id);
        const child = children.find((c) => c.child_id === r.child_id);
        const typeLabel =
          r.request_type === "photo" ? "фото" : r.request_type === "audio" ? "звук" : "локацию";
        toast({
          title: `⏱ Нет ответа: ${typeLabel}`,
          description: `${child?.first_name || "Ребёнок"} не ответил за ${notifPrefs.timeoutMinutes} мин`,
          variant: "destructive",
          duration: 30000,
          action: (
            <ToastAction altText="Открыть" onClick={() => setSelectedChild(r.child_id)}>
              Открыть
            </ToastAction>
          ),
        });
      });
    };

    check();
    const interval = window.setInterval(check, 30 * 1000);
    return () => window.clearInterval(interval);
  }, [children, notifPrefs, setSelectedChild, toast]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleStartChildSession = (childId: string, childName: string) => {
    // Store child session info and navigate to main app
    sessionStorage.setItem("activeChildId", childId);
    sessionStorage.setItem("activeChildName", childName);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-4xl animate-bounce">👨‍👩‍👧‍👦</div>
      </div>
    );
  }

  const selectedChildData = children.find((c) => c.child_id === selectedChild);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/auth")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Родительский кабинет</h1>
          </div>
          <div className="flex items-center gap-1">
            {pushPerm !== "unsupported" && pushPerm !== "granted" && (
              <Button variant="outline" size="sm" onClick={enablePush} className="gap-1">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Включить уведомления</span>
              </Button>
            )}
            {pushPerm === "granted" && (
              <Button variant="ghost" size="sm" disabled className="gap-1 text-muted-foreground">
                <Bell className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">Уведомления вкл.</span>
              </Button>
            )}
            {pushPerm === "denied" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <BellOff className="w-4 h-4" />
                <span className="hidden sm:inline">Заблокировано в браузере</span>
              </span>
            )}
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="w-5 h-5 mr-2" />
              Выйти
            </Button>
          </div>
        </div>

        {/* Push subscription status card */}
        {pushPerm !== "unsupported" && (
          <Card className="mb-6">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                {pushStatus?.subscribed && pushStatus?.matchesCurrentUser ? (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {pushStatus?.subscribed && pushStatus?.matchesCurrentUser
                      ? "Подписка активна на этом устройстве"
                      : pushStatus?.subscribed
                      ? "Подписка есть, но привязана к другому аккаунту"
                      : pushPerm === "denied"
                      ? "Уведомления заблокированы в браузере"
                      : "Не подписаны"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {pushStatus?.lastSyncedAt
                      ? `Синхронизировано: ${new Date(pushStatus.lastSyncedAt).toLocaleString("ru-RU")}`
                      : "Нет данных о синхронизации"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={refreshPushStatus} className="gap-1">
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Обновить</span>
                </Button>
                {pushStatus?.subscribed ? (
                  <>
                    <Button size="sm" variant="outline" onClick={resyncPush}>
                      Пересинхронизировать
                    </Button>
                    <Button size="sm" variant="ghost" onClick={disablePush} className="text-destructive">
                      Отписаться
                    </Button>
                  </>
                ) : (
                  pushPerm !== "denied" && (
                    <Button size="sm" onClick={enablePush} className="gap-1">
                      <Bell className="w-4 h-4" /> Подписаться
                    </Button>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="children" className="space-y-6">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="children" className="gap-1">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Дети</span>
            </TabsTrigger>
            <TabsTrigger value="invite" className="gap-1">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Привязка</span>
            </TabsTrigger>
            <TabsTrigger value="safety" className="gap-1" disabled={!selectedChild}>
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Защита</span>
            </TabsTrigger>
            <TabsTrigger value="mirror" className="gap-1" disabled={!selectedChild}>
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Зеркало</span>
            </TabsTrigger>
            <TabsTrigger value="room" className="gap-1" disabled={!selectedChild}>
              <House className="w-4 h-4" />
              <span className="hidden sm:inline">Домик</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-1" disabled={!selectedChild}>
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">ИИ</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-1">
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Игры</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite">
            <InvitePanel />
          </TabsContent>

          {/* Children Tab */}
          <TabsContent value="children" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Аккаунты детей</h2>
              <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                {showCreateForm ? "Отмена" : "Добавить ребёнка"}
              </Button>
            </div>

            {showCreateForm && (
              <CreateChildForm
                onSubmit={async (name, avatar) => {
                  await createChildAccount(name, avatar);
                  setShowCreateForm(false);
                }}
              />
            )}

            {children.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <div className="text-5xl mb-4">👶</div>
                  <p className="text-muted-foreground">
                    Добавьте аккаунт ребёнка, чтобы начать
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {children.map((child) => (
                  <ChildCard
                    key={child.child_id}
                    child={child}
                    isSelected={selectedChild === child.child_id}
                    onSelect={() => setSelectedChild(child.child_id)}
                    onStartSession={() => handleStartChildSession(child.child_id, child.first_name || "Ребёнок")}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          {/* Safety Tab */}
          <TabsContent value="safety" className="space-y-4">
            {selectedChildData ? (
              <>
                <SafetyPanel
                  childId={selectedChildData.child_id}
                  childName={selectedChildData.first_name || "Ребёнок"}
                />
                <MonitoringPanel
                  childId={selectedChildData.child_id}
                  childName={selectedChildData.first_name || "Ребёнок"}
                />
                <MonitoringNotificationSettings />
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Выберите ребёнка</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>


          {/* Mirror Tab */}
          <TabsContent value="mirror">
            {selectedChildData ? (
              <ActivityMirror
                childName={selectedChildData.first_name || "Ребёнок"}
                activities={childActivities}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Выберите ребёнка на вкладке "Дети"
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Child Room Tab */}
          <TabsContent value="room">
            {selectedChildData ? (
              <ChildRoomViewer
                childId={selectedChildData.child_id}
                childName={selectedChildData.first_name || "Ребёнок"}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Выберите ребёнка на вкладке "Дети"</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="analysis">
            {selectedChildData ? (
              <AIRecommendations
                childName={selectedChildData.first_name || "Ребёнок"}
                analysis={childAnalysis}
                onAnalyze={() => analyzeChild(selectedChild!)}
                isAnalyzing={analyzingChild}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Выберите ребёнка на вкладке "Дети"
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games">
            <GamesList
              children={children}
              sessions={gameSessions}
              onCreateGame={createGameSession}
              selectedChild={selectedChild}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
