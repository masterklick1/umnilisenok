type AuthAction = "sign-in" | "sign-up";

export function getRussianAuthError(error: unknown, action: AuthAction): string {
  const candidate = error as { code?: string; message?: string } | null;
  const code = candidate?.code?.toLowerCase() ?? "";
  const message = candidate?.message?.toLowerCase() ?? "";

  if (
    code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already")
  ) {
    return "Аккаунт с этой почтой уже существует. Войдите с правильным паролем или нажмите «Забыли пароль?».";
  }

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "Неверная почта или пароль. Проверьте данные или нажмите «Забыли пароль?».";
  }

  if (message.includes("email not confirmed")) {
    return "Почта ещё не подтверждена. Откройте письмо с подтверждением и попробуйте снова.";
  }

  if (message.includes("weak") || message.includes("pwned") || message.includes("known")) {
    return "Этот пароль слишком простой или небезопасный. Придумайте другой пароль.";
  }

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Слишком много попыток. Подождите несколько минут и попробуйте снова.";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "Нет связи с сервером. Проверьте интернет и попробуйте снова.";
  }

  return action === "sign-up"
    ? "Не удалось создать аккаунт. Проверьте данные и попробуйте снова."
    : "Не удалось войти. Проверьте почту и пароль или восстановите пароль.";
}