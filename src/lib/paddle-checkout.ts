import { initializePaddle, type Paddle, type PaddleEventData } from "@paddle/paddle-js";

export function getPaddlePurchaseConfig() {
  const mode = import.meta.env.VITE_PADDLE_ENVIRONMENT || "live";
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || "live_1304ee3d73b6079067238d4b85a";
  const priceId = import.meta.env.VITE_PADDLE_FULL_ACCESS_PRICE_ID || "pri_01m7hmyq4c89kvbatnev8mppd0";

  if (mode !== "live" && mode !== "sandbox") {
    throw new Error("Set VITE_PADDLE_ENVIRONMENT explicitly to live or sandbox.");
  }
  const environment = mode === "live" ? "production" : "sandbox";
  if (!token || !token.startsWith(mode === "live" ? "live_" : "test_")) {
    throw new Error(`Set VITE_PADDLE_CLIENT_TOKEN to a ${mode} client-side token.`);
  }
  if (!/^pri_[a-z0-9]{26}$/.test(priceId ?? "")) {
    throw new Error(`Set VITE_PADDLE_FULL_ACCESS_PRICE_ID to a price from the ${mode} catalog.`);
  }

  return { environment, token, priceId } as const;
}

let paddleInstance: Promise<Paddle> | undefined;
const listeners = new Set<(event: PaddleEventData) => void>();

export function onPaddleCheckoutEvent(listener: (event: PaddleEventData) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getCheckoutSettings() {
  return {
    displayMode: "overlay",
    variant: "one-page",
    allowLogout: false,
    showAddDiscounts: false,
    successUrl: new URL("/welcome", window.location.origin).href,
  } as const;
}

export function getPaddle() {
  const { environment, token } = getPaddlePurchaseConfig();
  paddleInstance ??= initializePaddle({
    environment,
    token,
    checkout: { settings: getCheckoutSettings() },
    eventCallback: (event) => listeners.forEach((listener) => listener(event)),
  }).then((instance) => {
    if (!instance) throw new Error("Paddle.js did not initialize.");
    return instance;
  }).catch((error: unknown) => {
    paddleInstance = undefined;
    throw error;
  });
  return paddleInstance;
}
