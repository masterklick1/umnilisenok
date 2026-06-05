import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Mic, MapPin, RefreshCw, Loader2, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  childId: string;
  childName: string;
}

interface RequestRow {
  id: string;
  request_type: "photo" | "audio" | "location";
  status: string;
  result_path: string | null;
  result_data: any;
  signed_url: string | null;
  created_at: string;
  fulfilled_at: string | null;
}

export function MonitoringPanel({ childId, childName }: Props) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("monitoring-request", {
      body: undefined,
      method: "GET" as any,
      // workaround: use query via url - invoke doesn't support query, so call fetch directly
    } as any);
    // Fallback: use direct fetch with query params (invoke doesn't pass query)
    try {
      const { data: session } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monitoring-request?action=list&child_id=${childId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      const j = await res.json();
      if (j.requests) setRequests(j.requests);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`mon-${childId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "monitoring_requests", filter: `child_id=eq.${childId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [childId, load]);

  const createRequest = async (type: "photo" | "audio" | "location") => {
    setCreating(type);
    try {
      const { data: session } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monitoring-request?action=create`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({ child_id: childId, request_type: type }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Ошибка");
      toast({
        title: "Запрос отправлен",
        description: `${childName} увидит уведомление и устройство ответит автоматически.`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Не удалось отправить", description: e.message, variant: "destructive" });
    }
    setCreating(null);
  };

  const statusBadge = (s: string) => {
    if (s === "fulfilled") return <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" />Выполнено</Badge>;
    if (s === "failed") return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Ошибка</Badge>;
    return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Ожидание</Badge>;
  };

  const typeLabel = (t: string) => t === "photo" ? "📷 Фото" : t === "audio" ? "🎙 Звук" : "📍 Локация";

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

        <div className="space-y-2">
          <h4 className="text-sm font-medium">История запросов</h4>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Запросов пока нет</p>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium">{typeLabel(r.request_type)}</span>
                  {statusBadge(r.status)}
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("ru-RU")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
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
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
