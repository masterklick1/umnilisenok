import { supabase } from "@/integrations/supabase/client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const parseInviteCode = (raw: string): string | null => {
  const text = raw.trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get("code");
    if (fromQuery) return fromQuery.toUpperCase();
  } catch {
    // not a URL
  }

  const match = text.toUpperCase().match(/[A-Z2-9]{6}/);
  return match ? match[0] : null;
};

const redeemInvite = async (code: string, childId: string) => {
  const normalized = code.trim().toUpperCase();
  let lastError: { message: string } | null = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    const { error } = await supabase.rpc("redeem_child_invite", {
      p_code: normalized,
      p_child_id: childId,
    });
    if (!error) return null;

    lastError = error;
    const retryable =
      error.message.includes("Invalid child account") ||
      error.message.includes("Invalid or expired invite code");
    if (!retryable || attempt === 9) return error;
    await sleep(400);
  }

  return lastError;
};

/** Parent created invite — child connects with code only (no email/password).
 *  Код постоянный: если аккаунт по нему уже создан, входим в тот же аккаунт
 *  (например, после переустановки приложения). */
export const connectChildWithInviteCode = async (
  rawCode: string,
): Promise<{ ok: true; childId: string; childName: string } | { ok: false; error: string }> => {
  const code = parseInviteCode(rawCode);
  if (!code || code.length !== 6) {
    return { ok: false, error: "Неверный код. Нужно 6 символов." };
  }

  // 1) Повторный вход в уже созданный детский аккаунт по тому же коду.
  try {
    const { data: loginData } = await supabase.functions.invoke("child-code-login", {
      body: { code },
    });
    if (loginData?.status === "existing" && loginData.tokenHash) {
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: loginData.tokenHash as string,
        type: "email",
      });
      if (!otpError) {
        sessionStorage.setItem("activeChildId", loginData.childId);
        sessionStorage.setItem("activeChildName", loginData.childName);
        return { ok: true, childId: loginData.childId, childName: loginData.childName };
      }
      return { ok: false, error: otpError.message };
    }
  } catch {
    // функция недоступна — пробуем обычную привязку ниже
  }

  const { data, error: lookupError } = await supabase.rpc("get_invite_by_code", { p_code: code });
  if (lookupError) {
    return { ok: false, error: lookupError.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { ok: false, error: "Код не найден. Попроси родителя новый код." };
  }


  const childName = row.child_first_name as string;
  const email = `child_${Date.now()}_${Math.random().toString(36).slice(2)}@internal.app`;
  const password = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: childName, role: "child" },
    },
  });

  if (signupError || !signupData.user) {
    return { ok: false, error: signupError?.message || "Не удалось создать аккаунт" };
  }

  const childId = signupData.user.id;

  const redeemError = await redeemInvite(code, childId);
  if (redeemError) {
    return { ok: false, error: redeemError.message };
  }

  sessionStorage.setItem("activeChildId", childId);
  sessionStorage.setItem("activeChildName", childName);

  return { ok: true, childId, childName };
};
