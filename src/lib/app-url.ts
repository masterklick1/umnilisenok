/** Public app URL for invite links / QR (must be reachable from child's phone). */
export const getPublicAppUrl = (): string => {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // localhost invite links don't work on another device — use published Lovable URL
    return "https://86978e2a-f29e-4522-8874-3ecba72c9930.lovableproject.com";
  }

  return origin;
};

export const joinInviteUrl = (code: string) =>
  `${getPublicAppUrl()}/join?code=${encodeURIComponent(code)}`;
