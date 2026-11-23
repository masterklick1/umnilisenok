import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CARD = "4713 3800 1322 1367";

export type Receipt = { id: string; approved_at: string | null; email: string | null; amount: string };
export type Status = { approved: boolean; pending: boolean; receipt?: Receipt | null };

export async function call(action: "status" | "request"): Promise<Status> {
  const { data, error } = await supabase.functions.invoke<Status & { error?: string }>("manual-payment", { body: { action } });
  if (error || !data) {
    const body = await (error as { context?: Response } | null)?.context?.json?.().catch(() => null);
    throw new Error(body?.error ?? "failed");
  }
  return data;
}

export default function ManualPaymentCard({ onApproved }: { onApproved?: (v: boolean) => void }) {
  const { user, isDemo, loading } = useAuth();
  const [status, setStatus] = useState<Status>();
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!user || isDemo) return;
    let alive = true;
    const load = () => call("status").then((s) => { if (alive) { setStatus(s); onApproved?.(s.approved); } }).catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [user, isDemo, onApproved]);

  async function copy() {
    try { await navigator.clipboard.writeText(CARD.replace(/ /g, "")); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }

  async function paid() {
    setSending(true); setError(undefined);
    try { setStatus(await call("request")); }
    catch (e) {
      setError(e instanceof Error && e.message === "parent_account_required"
        ? "Оплата доступна только из родительского аккаунта."
        : "Не удалось отправить заявку. Попробуйте ещё раз.");
    } finally { setSending(false); }
  }

  if (status?.approved) return (
    <section className="space-y-3 rounded-2xl border bg-background p-4">
      <p role="status" className="font-semibold text-primary">✅ Полный доступ активирован. Спасибо, что вы с нами!</p>
      {status.receipt && <ReceiptView r={status.receipt} />}
      <Button asChild variant="outline" className="w-full"><a href="/parent">Вернуться в кабинет</a></Button>
    </section>
  );

  return (
    <section className="space-y-4 rounded-2xl border bg-background p-4">
      <h2 className="text-xl font-bold">Оплата по QR или переводом</h2>
      <p className="text-3xl font-bold text-primary">10 TJS</p>
      <img src="/qr-dc.jpg" alt="QR-код Dushanbe City на 10 TJS" className="mx-auto w-full max-w-[260px] rounded-xl" />
      <p className="text-sm text-muted-foreground">
        Dushanbe City — отсканируйте QR. Alif Mobi, Эсхата и другие банки: если QR не читается, переведите 10 TJS на карту:
      </p>
      <div className="flex items-center justify-between gap-2 rounded-xl bg-muted p-3">
        <span className="font-mono text-lg font-semibold">{CARD}</span>
        <Button size="sm" variant="outline" onClick={copy}>{copied ? "Скопировано" : "Скопировать"}</Button>
      </div>
      {!loading && (!user || isDemo) ? (
        <Button asChild className="w-full"><a href="/auth?mode=login&next=checkout">Войти как родитель</a></Button>
      ) : status?.pending ? (
        <p role="status" className="rounded-xl bg-muted p-3 text-sm">
          ⏳ Ожидает подтверждения. Мы проверяем перевод — обычно 5–15 минут, доступ включится автоматически.
        </p>
      ) : null}
      {status?.pending && (
        <Button asChild variant="outline" className="w-full"><a href="/parent">Вернуться в кабинет</a></Button>
      )}
      {!status?.pending && user && !isDemo ? (
      ) : (
        <Button className="w-full" onClick={paid} disabled={sending || loading}>
          {sending ? "Отправляем…" : "Я оплатил(а)"}
        </Button>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

export function ReceiptView({ r }: { r: Receipt }) {
  const d = r.approved_at ? new Date(r.approved_at).toLocaleString("ru-RU") : "—";
  return (
    <div id="receipt" className="space-y-1 rounded-xl border border-dashed p-4 text-sm">
      <p className="text-center font-bold">🦊 Умный лисёнок — электронный чек</p>
      <p>Номер заказа: <span className="font-mono">{r.id.slice(0, 8).toUpperCase()}</span></p>
      <p>Дата: {d}</p>
      <p>Покупатель: {r.email ?? "—"}</p>
      <p>Услуга: Полный доступ (навсегда)</p>
      <p className="font-bold">Сумма: {r.amount} · Оплачено</p>
      <Button size="sm" variant="ghost" className="w-full print:hidden" onClick={() => window.print()}>Сохранить / распечатать чек</Button>
    </div>
  );
}
