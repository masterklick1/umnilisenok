import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Camera, Mic, MapPin, RefreshCw, Loader2, CheckCircle2, XCircle, Clock,
  ExternalLink, Ban, Repeat, Sparkles, ShieldAlert, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  childId: string;
  childName: string;
}

interface AiAnalysis {
  scene?: string;
  safety_score?: number | null;
  concerns?: string[];
  summary?: string;
}

interface RequestRow {
  id: string;
  request_type: "photo" | "audio" | "location";
  status: string;
  result_path: string | null;
  result_data: { ai_analysis?: AiAnalysis; cancelled?: boolean; [k: string]: any } | null;
  signed_url: string | null;
  created_at: string;
  fulfilled_at: string | null;
}

type TypeFilter = "all" | "photo" | "audio" | "location";
type StatusFilter = "all" | "pending" | "fulfilled" | "failed";

export function MonitoringPanel({ childId, childName }: Props) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const params = new URLSearchParams({
        action: "list",
        child_id: childId,
        type: typeFilter,
        status: statusFilter,
      });
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monitoring-request?${params}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      const j = await res.json();
      if (j.requests) setRequests(j.requests);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [childId, typeFilter, statusFilter]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`mon-${childId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "monitoring_requests", filter: `child_id=eq.${childId}` },
        (payload) => {
          const row: any = payload.new ?? payload.old;
          if (row?.id && (payload.eventType === "UPDATE" || payload.eventType === "INSERT")) {
            setHighlightId(row.id);
            window.setTimeout(() => setHighlightId((curr) => (curr === row.id ? null : curr)), 4000);
          }
          load();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [childId, load]);

  const callFn = async (action: string, body: any) => {
    const { data: session } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monitoring-request?action=${action}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.session?.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Ошибка");
    return j;
  };

  const createRequest = async (type: "photo" | "audio" | "location") => {
    setCreating(type);
    try {
      await callFn("create", { child_id: childId, request_type: type });
      toast({ title: "Запрос отправлен", description: `${childName} увидит уведомление.` });
      await load();
    } catch (e: any) {
      toast({ title: "Не удалось отправить", description: e.message, variant: "destructive" });
    }
    setCreating(null);
  };

  const cancelRequest = async (id: string) => {
    setBusyId(id);
    try {
      await callFn("cancel", { id });
      toast({ title: "Запрос отменён" });
      await load();
    } catch (e: any) {
      toast({ title: "Не удалось отменить", description: e.message, variant: "destructive" });
    }
    setBusyId(null);
  };

  const repeatRequest = async (type: "photo" | "audio" | "location") => {
    await createRequest(type);
  };

  const analyzePhoto = async (id: string) => {
    setBusyId(id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-monitoring`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ request_id: id }),
        }
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Ошибка ИИ");
      toast({ title: "ИИ-анализ готов", description: j.analysis?.summary || "Готово" });
      await load();
    } catch (e: any) {
      toast({ title: "Не удалось проанализировать", description: e.message, variant: "destructive" });
    }
    setBusyId(null);
  };

  const statusBadge = (s: string) => {
    if (s === "fulfilled") return <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" />Выполнено</Badge>;
    if (s === "failed") return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Ошибка</Badge>;
    return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Ожидание</Badge>;
  };

  const typeLabel = (t: string) => t === "photo" ? "📷 Фото" : t === "audio" ? "🎙 Звук" : "📍 Локация";

  const renderAi = (a?: AiAnalysis) => {
    if (!a) return null;
    const score = a.safety_score;
    const safe = typeof score === "number" && score >= 4;
    return (
      <div className="w-full mt-2 rounded-md border bg-muted/30 p-2 text-xs space-y-1">
        <div className="flex items-center gap-2 font-medium">
          {safe ? (
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
          )}
          ИИ-анализ
          {typeof score === "number" && (
            <Badge variant={safe ? "secondary" : "destructive"} className="ml-auto">
              Безопасность: {score}/5
            </Badge>
          )}
        </div>
        {a.scene && <div className="text-muted-foreground">{a.scene}</div>}
        {a.concerns && a.concerns.length > 0 && (
          <ul className="list-disc list-inside text-destructive">
            {a.concerns.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        )}
        {a.summary && <div className="italic">{a.summary}</div>}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Удалённая проверка · {childName}</span>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ребёнок получит уведомление о проверке — никакой скрытой слежки.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => createRequest("photo")} disabled={creating !== null} variant="outline" className="gap-1">
            {creating === "photo" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            Фото
          </Button>
          <Button onClick={() => createRequest("audio")} disabled={creating !== null} variant="outline" className="gap-1">
            {creating === "audio" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            Звук
          </Button>
          <Button onClick={() => createRequest("location")} disabled={creating !== null} variant="outline" className="gap-1">
            {creating === "location" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            Локация
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Фильтр:</span>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="photo">📷 Фото</SelectItem>
              <SelectItem value="audio">🎙 Звук</SelectItem>
              <SelectItem value="location">📍 Локация</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="pending">Ожидание</SelectItem>
              <SelectItem value="fulfilled">Выполнено</SelectItem>
              <SelectItem value="failed">Ошибка</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">История запросов</h4>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Запросов пока нет</p>
          ) : (
            requests.map((r) => {
              const ai = r.result_data?.ai_analysis;
              return (
                <div
                  key={r.id}
                  className={`border rounded-lg p-3 transition-all duration-500 ${
                    highlightId === r.id
                      ? "ring-2 ring-primary bg-primary/5 shadow-md animate-pulse"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-wrap">
                      <span className="text-sm font-medium">{typeLabel(r.request_type)}</span>
                      {statusBadge(r.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("ru-RU")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.request_type === "location" && r.result_data?.latitude && (
                        <a
                          href={`https://www.google.com/maps?q=${r.result_data.latitude},${r.result_data.longitude}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary inline-flex items-center gap-1"
                        >
                          На карте <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {r.signed_url && r.request_type === "photo" && (
                        <a href={r.signed_url} target="_blank" rel="noopener noreferrer">
                          <img src={r.signed_url} alt="snap" className="w-16 h-16 object-cover rounded" />
                        </a>
                      )}
                      {r.signed_url && r.request_type === "audio" && (
                        <audio controls src={r.signed_url} className="h-8" />
                      )}

                      {r.status === "pending" && (
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => cancelRequest(r.id)}
                          disabled={busyId === r.id}
                          className="text-destructive h-7 px-2"
                        >
                          {busyId === r.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Ban className="w-3 h-3" />}
                          <span className="ml-1 text-xs">Отменить</span>
                        </Button>
                      )}

                      {(r.status === "failed" || r.status === "fulfilled") && (
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => repeatRequest(r.request_type)}
                          disabled={creating !== null}
                          className="h-7 px-2"
                        >
                          <Repeat className="w-3 h-3" />
                          <span className="ml-1 text-xs">Повторить</span>
                        </Button>
                      )}

                      {r.request_type === "photo" && r.status === "fulfilled" && r.signed_url && !ai && (
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => analyzePhoto(r.id)}
                          disabled={busyId === r.id}
                          className="h-7 px-2"
                        >
                          {busyId === r.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Sparkles className="w-3 h-3 text-primary" />}
                          <span className="ml-1 text-xs">ИИ-анализ</span>
                        </Button>
                      )}
                    </div>
                  </div>
                  {renderAi(ai)}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
