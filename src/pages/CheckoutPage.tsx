import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { CheckoutEventNames, type Paddle } from "@paddle/paddle-js";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { getCheckoutSettings, getPaddle, getPaddlePurchaseConfig, onPaddleCheckoutEvent } from "@/lib/paddle-checkout";

type Offer = { paddle: Paddle; priceId: string; total: string };

async function billingRequest<T>(action: "status" | "checkout" | "portal"): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(`paddle-account?action=${action}`);
  if (error || !data) throw error ?? new Error("No billing response");
  return data;
}

function usePurchaseStatus() {
  const { user, isDemo } = useAuth();
  return useQuery({
    queryKey: ["paddle-purchase", user?.id],
    enabled: Boolean(user && !isDemo && !Capacitor.isNativePlatform()),
    queryFn: () => billingRequest<{ paid: boolean }>("status"),
    retry: false,
  });
}

export default function CheckoutPage() {
  const { t, language } = useLanguage();
  const { user, loading, isDemo } = useAuth();
  const purchase = usePurchaseStatus();
  const [offer, setOffer] = useState<Offer>();
  const [priceUnavailable, setPriceUnavailable] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);
  const [opening, setOpening] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  const pricingUrl = language === "en" ? "/pricing.html#english" : "/pricing.html";

  useEffect(() => {
    if (isNative) return;

    let active = true;
    const unsubscribe = onPaddleCheckoutEvent(({ name }) => {
      if (name === CheckoutEventNames.CHECKOUT_CLOSED) setOpening(false);
      if (name === CheckoutEventNames.CHECKOUT_ERROR || name === CheckoutEventNames.CHECKOUT_FAILED) {
        setOpening(false);
        setCheckoutError(true);
      }
    });

    async function loadOffer() {
      try {
        const { priceId } = getPaddlePurchaseConfig();
        const paddle = await getPaddle();
        // The Lovable static host does not pass request headers to Vite. Paddle detects the country by IP.
        const { data } = await paddle.PricePreview({ items: [{ priceId, quantity: 1 }] });
        const line = data.details.lineItems.find((item) => item.price.id === priceId);
        if (!line || line.price.billingCycle || !line.formattedTotals.total) {
          throw new Error("Paddle did not return a total for the one-time price.");
        }
        if (active) setOffer({ paddle, priceId, total: line.formattedTotals.total });
      } catch (error) {
        if (active) {
          console.error("Paddle price unavailable", error);
          setPriceUnavailable(true);
        }
      }
    }

    void loadOffer();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [isNative]);

  async function openCheckout() {
    if (!offer || opening || loading || isNative || !user || isDemo || purchase.data?.paid !== false) return;
    setOpening(true);
    setCheckoutError(false);

    try {
      const transaction = await billingRequest<{ transactionId: string; priceId: string }>("checkout");
      if (transaction.priceId !== offer.priceId || !/^txn_[a-z0-9]{26}$/.test(transaction.transactionId)) {
        throw new Error("Paddle returned a different offer");
      }
      offer.paddle.Checkout.open({
        transactionId: transaction.transactionId,
        settings: { ...getCheckoutSettings(), locale: language },
      });
    } catch {
      setOpening(false);
      setCheckoutError(true);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    setCheckoutError(false);
    try {
      const { url } = await billingRequest<{ url: string }>("portal");
      window.location.assign(url);
    } catch {
      setCheckoutError(true);
      setPortalLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-lg space-y-5 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <a className="text-sm font-medium text-primary underline" href={pricingUrl}>
          {t("Назад к описанию", "Back to pricing")}
        </a>
        <h1 className="text-3xl font-bold">{t("Полный доступ", "Full access")}</h1>
        <p>{t("Уроки, сказки и игры «Умного Лисёнка» за один разовый платёж.", "Clever Little Fox lessons, stories and games for a one-time payment.")}</p>
        {purchase.data?.paid ? (
          <>
            <p role="status">{t("Полный доступ активен.", "Full access is active.")}</p>
            <Button onClick={openPortal} disabled={portalLoading}>
              {t("История покупок в Paddle", "Purchase history in Paddle")}
            </Button>
          </>
        ) : offer ? (
          <>
            <p className="text-4xl font-bold text-primary">{offer.total}</p>
            <p className="text-sm text-muted-foreground">
              {t("Итог зависит от платёжного адреса. Проверьте сумму в окне оплаты.", "Your billing address can affect the total. Check the amount in checkout.")}
            </p>
            {!loading && (!user || isDemo) ? (
              <Button asChild className="w-full">
                <a href="/auth?mode=login&next=checkout">
                  {t("Войти как родитель", "Sign in as a parent")}
                </a>
              </Button>
            ) : purchase.isError ? (
              <p role="status">{t("Оплата доступна из родительского аккаунта, когда платёжный сервис подключён.", "Checkout is available from a parent account once billing is enabled.")}</p>
            ) : (
              <Button className="w-full" onClick={openCheckout} disabled={loading || opening || purchase.data?.paid !== false}>
                {opening ? t("Открываем оплату…", "Opening checkout…") : t("Купить полный доступ", "Buy full access")}
              </Button>
            )}
          </>
        ) : isNative || priceUnavailable ? (
          <p role="status">{t("Оплата сейчас недоступна.", "Checkout is currently unavailable.")}</p>
        ) : (
          <p role="status">{t("Загружаем цену…", "Loading price…")}</p>
        )}
        {checkoutError && <p role="alert">{t("Не удалось открыть оплату. Попробуйте ещё раз.", "Could not open checkout. Please try again.")}</p>}
      </div>
    </main>
  );
}

export function CheckoutWelcomePage() {
  const { t } = useLanguage();
  const purchase = usePurchaseStatus();
  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-lg space-y-5 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold">{t("Спасибо!", "Thank you!")}</h1>
        <p role="status">
          {purchase.data?.paid
            ? t("Полный доступ активен.", "Full access is active.")
            : t("Проверяем подтверждение от Paddle. Оно может прийти после завершения оплаты.", "Waiting for confirmation from Paddle. It may arrive shortly after checkout.")}
        </p>
        <p><a className="font-medium text-primary underline" href="/checkout">
          {t("Проверить доступ и историю покупок", "Check access and purchase history")}
        </a></p>
        <a className="font-medium text-primary underline" href="/auth">{t("Открыть приложение", "Open the app")}</a>
      </div>
    </main>
  );
}
