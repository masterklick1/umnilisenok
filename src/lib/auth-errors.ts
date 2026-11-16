import type { Translate } from "@/contexts/LanguageContext";

type AuthAction = "sign-in" | "sign-up";

export function getAuthError(error: unknown, action: AuthAction, t: Translate): string {
  const candidate = error as { code?: string; message?: string } | null;
  const code = candidate?.code?.toLowerCase() ?? "";
  const message = candidate?.message?.toLowerCase() ?? "";

  if (
    code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already")
  ) {
    return t("Аккаунт с этой почтой уже существует. Войдите с правильным паролем или нажмите «Забыли пароль?».", "An account already exists for this email. Sign in with your password or select “Forgot your password?”");
  }

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return t("Неверная почта или пароль. Проверьте данные или нажмите «Забыли пароль?».", "The email or password is incorrect. Check your details or select “Forgot your password?”");
  }

  if (message.includes("email not confirmed")) {
    return t("Почта ещё не подтверждена. Откройте письмо с подтверждением и попробуйте снова.", "Your email hasn’t been verified yet. Open the verification email and try again.");
  }

  if (message.includes("weak") || message.includes("pwned") || message.includes("known")) {
    return t("Этот пароль слишком простой или небезопасный. Придумайте другой пароль.", "This password is too weak. Choose a stronger password.");
  }

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return t("Слишком много попыток. Подождите несколько минут и попробуйте снова.", "Too many attempts. Wait a few minutes and try again.");
  }

  if (message.includes("network") || message.includes("fetch")) {
    return t("Нет связи с сервером. Проверьте интернет и попробуйте снова.", "We couldn’t connect. Check your internet connection and try again.");
  }

  return action === "sign-up"
    ? t("Не удалось создать аккаунт. Проверьте данные и попробуйте снова.", "We couldn’t create your account. Check your details and try again.")
    : t("Не удалось войти. Проверьте почту и пароль или восстановите пароль.", "We couldn’t sign you in. Check your email and password or reset your password.");
}