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
import { SelectedChildBar } from "@/components/parental/SelectedChildBar";
import { ArrowLeft, Users, Eye, Brain, Gamepad2, LogOut, Shield, Link2, Bell, BellOff, RefreshCw, CheckCircle2, XCircle, House, Lock } from "lucide-react";
import { ChildRoomViewer } from "@/components/parental/ChildRoomViewer";
import { MonitoringPanel } from "@/components/parental/MonitoringPanel";
import { MonitoringNotificationSettings, loadMonitoringPrefs, shouldNotify, type MonitoringNotifPrefs } from "@/components/parental/MonitoringNotificationSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { isPushSupported, getPushPermission, subscribeToPush, ensureServiceWorker, getPushStatus, unsubscribeFromPush, type PushStatus } from "@/lib/push";
import { getStoredPin, isParentPinUnlocked, unlockParentPin } from "@/lib/parent-pin";
import { Input } from "@/components/ui/input";

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
  const [activeTab, setActiveTab] = useState("children");
  const { toast } = useToast();
  const [pushPerm, setPushPerm] = useState<NotificationPermission | "unsupported">(
    isPushSupported() ? getPushPermission() : "unsupported"
  );
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<MonitoringNotifPrefs>(loadMonitoringPrefs());
  const [pinUnlocked, setPinUnlocked] = useState(() => isParentPinUnlocked());
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

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
    sessionStorage.setItem("activeChildId", childId);
    sessionStorage.setItem("activeChildName", childName);
    navigate("/");
  };

  const openChildTab = (childId: string, tab: "safety" | "mirror") => {
    setSelectedChild(childId);
    setActiveTab(tab);
  };

  // Auto-select child who is playing on own phone right now
  useEffect(() => {
    if (selectedChild || children.length === 0) return;
    const playingNow = children.find(
      (c) =>
        c.connected_via_invite &&
        c.last_activity_at &&
        Date.now() - new Date(c.last_activity_at).getTime() < 5 * 60 * 1000,
    );
    if (playingNow) {
      setSelectedChild(playingNow.child_id);
    }
  }, [children, selectedChild, setSelectedChild]);

  const verifyParentPin = () => {
    const stored = getStoredPin();
    if (stored && pinInput === stored) {
      unlockParentPin();
      setPinUnlocked(true);
      setPinError(false);
      setPinInput("");
      return;
    }
    setPinError(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-4xl animate-bounce">👨‍👩‍👧‍👦</div>
      </div>
    );
  }

  if (getStoredPin() && !pinUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center">
              <Lock className="w-10 h-10 mx-auto mb-2 text-primary" />
              <h2 className="text-xl font-bold">Родительский PIN</h2>
              <p className="text-sm text-muted-foreground">Введи 4-значный PIN для доступа</p>
            </div>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4));
                setPinError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && pinInput.length === 4 && verifyParentPin()}
              className="text-center text-2xl tracking-widest"
            />
            {pinError && <p className="text-sm text-destructive text-center">Неверный PIN</p>}
            <Button className="w-full" disabled={pinInput.length !== 4} onClick={verifyParentPin}>
              Войти
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
              Назад
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedChildData = children.find((c) => c.child_id === selectedChild);
  const ownPhoneChildren = children.filter((c) => c.connected_via_invite);
  const thisDeviceChildren = children.filter((c) => !c.connected_via_invite);

  const renderChildCards = (list: typeof children) =>
    list.map((child) => (
      <ChildCard
        key={child.child_id}
        child={child}
        isSelected={selectedChild === child.child_id}
        onSelect={() => setSelectedChild(child.child_id)}
        onStartSession={() => handleStartChildSession(child.child_id, child.first_name || "Ребёнок")}
        onOpenSafety={() => openChildTab(child.child_id, "safety")}
        onOpenMirror={() => openChildTab(child.child_id, "mirror")}
      />
    ));

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

        {selectedChildData && (
          <SelectedChildBar
            childName={selectedChildData.first_name || "Ребёнок"}
            connectedViaInvite={selectedChildData.connected_via_invite}
            lastActivityAt={selectedChildData.last_activity_at}
            onOpenSafety={() => setActiveTab("safety")}
            onOpenMirror={() => setActiveTab("mirror")}
            onClear={() => setSelectedChild(null)}
          />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full h-auto overflow-x-auto p-1 gap-1 justify-start no-scrollbar">
            <TabsTrigger value="children" className="flex-shrink-0 flex-col gap-0.5 py-2 px-2.5 min-w-[3.5rem]">
              <Users className="w-4 h-4" />
              <span className="text-[10px] leading-tight">Дети</span>
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex-shrink-0 flex-col gap-0.5 py-2 px-2.5 min-w-[3.5rem]">
              <Link2 className="w-4 h-4" />
              <span className="text-[10px] leading-tight">Код</span>
            </TabsTrigger>
            <TabsTrigger value="safety" className="flex-shrink-0 flex-col gap-0.5 py-2 px-2.5 min-w-[3.5rem]" disabled={!selectedChild}>
              <Shield className="w-4 h-4" />
              <span className="text-[10px] leading-tight">Защита</span>
            </TabsTrigger>
            <TabsTrigger value="mirror" className="flex-shrink-0 flex-col gap-0.5 py-2 px-2.5 min-w-[3.5rem]" disabled={!selectedChild}>
              <Eye className="w-4 h-4" />
              <span className="text-[10px] leading-tight">Зеркало</span>
            </TabsTrigger>
            <TabsTrigger value="room" className="flex-shrink-0 flex-col gap-0.5 py-2 px-2.5 min-w-[3.5rem]" disabled={!selectedChild}>
              <House className="w-4 h-4" />
              <span className="text-[10px] leading-tight">Домик</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex-shrink-0 flex-col gap-0.5 py-2 px-2.5 min-w-[3.5rem]" disabled={!selectedChild}>
              <Brain className="w-4 h-4" />
              <span className="text-[10px] leading-tight">ИИ</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="flex-shrink-0 flex-col gap-0.5 py-2 px-2.5 min-w-[3.5rem]">
              <Gamepad2 className="w-4 h-4" />
              <span className="text-[10px] leading-tight">Игры</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite">
            <InvitePanel />
          </TabsContent>

          {/* Children Tab */}
          <TabsContent value="children" className="space-y-6">
            {children.length === 0 ? (
              <>
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
                <Card>
                  <CardContent className="py-8 text-center">
                    <div className="text-5xl mb-4">👶</div>
                    <p className="text-muted-foreground">
                      Добавьте аккаунт ребёнка или привяжите телефон через вкладку «Код»
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {ownPhoneChildren.length > 0 && (
                  <section className="space-y-4">
                    <Card className="border-green-200 bg-green-50/50">
                      <CardContent className="py-4 px-4">
                        <p className="text-sm font-medium">📱 На своём телефоне</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ребёнок играет на своём устройстве. Следите через «Зеркало» и «Защита» —
                          карта и активность обновляются с его телефона.
                        </p>
                      </CardContent>
                    </Card>
                    <h2 className="text-lg font-semibold">Дети на своём телефоне</h2>
                    <div className="grid gap-4 md:grid-cols-2">{renderChildCards(ownPhoneChildren)}</div>
                  </section>
                )}

                <section className="space-y-4">
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="py-4 px-4">
                      <p className="text-sm font-medium">💻 На этом устройстве</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Вы остаётесь залогинены как родитель. «Играть здесь» — ребёнок занимается на
                        вашем телефоне, вы возвращаетесь в кабинет одной кнопкой.
                      </p>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Дети на этом телефоне</h2>
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

                  {thisDeviceChildren.length === 0 ? (
                    <Card>
                      <CardContent className="py-6 text-center text-sm text-muted-foreground">
                        Нет локальных аккаунтов — нажмите «Добавить ребёнка» или привяжите телефон
                        ребёнка через вкладку «Код».
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">{renderChildCards(thisDeviceChildren)}</div>
                  )}
                </section>
              </>
            )}
          </TabsContent>
          {/* Safety Tab */}
          <TabsContent value="safety" className="space-y-4">
            {selectedChildData ? (
              <>
                {selectedChildData.connected_via_invite && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="py-3 px-4 text-sm">
                      <p className="font-medium">📱 {selectedChildData.first_name} на своём телефоне</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Карта обновляется автоматически. Поставьте зону «Садик», «Школа» или своё
                        место — получите уведомление, если ребёнок выйдет. Кнопка «Где сейчас?» —
                        мгновенная проверка.
                      </p>
                    </CardContent>
                  </Card>
                )}
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
                connectedViaInvite={selectedChildData.connected_via_invite}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center space-y-2">
                  <p className="text-muted-foreground">
                    Выберите ребёнка на вкладке «Это устройство»
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Если ребёнок на своём телефоне — выберите карточку с меткой «📱 Свой
                    телефон» и зелёной отметкой «Сейчас играет».
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
