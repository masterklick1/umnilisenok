import { initializePaddle, type Paddle, type PaddleEventData } from "@paddle/paddle-js";

export function getPaddlePurchaseConfig() {
  const mode = import.meta.env.VITE_PADDLE_ENVIRONMENT;
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  const priceId = import.meta.env.VITE_PADDLE_FULL_ACCESS_PRICE_ID;

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
