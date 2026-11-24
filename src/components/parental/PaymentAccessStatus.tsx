import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { CheckCircle2, Clock3, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReceiptView } from "@/components/ManualPaymentCard";
import { useManualPaymentStatus } from "@/hooks/useManualPaymentStatus";
import { useAuth } from "@/contexts/AuthContext";

export function PaymentAccessStatus() {
  const { user } = useAuth();
  const { data, isError, refetch } = useManualPaymentStatus();
  const [open, setOpen] = useState(false);
  const receipt = data?.receipt;
  const seenKey = user && receipt ? `payment-notice:${user.id}:${receipt.id}` : null;

  useEffect(() => {
    if (!seenKey) return;
    try { if (!localStorage.getItem(seenKey)) setOpen(true); }
    catch { setOpen(true); }
  }, [seenKey]);

  function close(value: boolean) {
    setOpen(value);
    if (!value && seenKey) {
      try { localStorage.setItem(seenKey, "seen"); } catch { /* notification still works without storage */ }
    }
  }

  return (
    <section aria-label="Статус полного доступа" className="mb-6 border-y py-4">
      {data?.approved ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="h-5 w-5 shrink-0" />Полный доступ активирован</p>
          {receipt && <Button variant="outline" size="sm" onClick={() => setOpen(true)}><ReceiptText className="mr-2 h-4 w-4" />Квитанция · 10 сомони</Button>}
        </div>
      ) : data?.pending ? (
        <div role="status" className="space-y-1">
          <p className="flex items-center gap-2 font-semibold text-warning"><Clock3 className="h-5 w-5 shrink-0" />Оплата ожидает подтверждения</p>
          <p className="text-sm text-muted-foreground">Мы проверяем перевод. После подтверждения полный доступ активируется автоматически.</p>
        </div>
      ) : isError ? (
        <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-muted-foreground">Не удалось проверить статус оплаты.</p><Button size="sm" variant="outline" onClick={() => void refetch()}>Повторить</Button></div>
      ) : !Capacitor.isNativePlatform() ? (
        <Button asChild variant="outline"><Link to="/checkout">Полный доступ</Link></Button>
      ) : null}
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-success" />
            <DialogTitle className="text-center">Ваш полный доступ активирован!</DialogTitle>
            <DialogDescription className="text-center">Спасибо, что вы с нами! Мы будем делать «Умного лисёнка» ещё лучше для вашей семьи.</DialogDescription>
          </DialogHeader>
          {receipt && <ReceiptView r={receipt} />}
          <Button onClick={() => close(false)}>Отлично!</Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}