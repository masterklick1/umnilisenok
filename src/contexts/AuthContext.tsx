import { useLanguage } from "@/contexts/LanguageContext";
import { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { unsubscribeFromPush, subscribeToPush, isPushSupported } from "@/lib/push";
import { getAuthError } from "@/lib/auth-errors";
import {
  clearDemoSession,
  createDemoUser,
  isDemoSessionActive,
  isDemoUser,
  startDemoSession,
} from "@/lib/demo-session";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, firstName?: string) => Promise<{ error: AuthError | Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  startDemo: () => void;
  isDemo: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoActive, setDemoActive] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isDemoSessionActive()) {
      if (!demoActive) setDemoActive(true);
      setUser(createDemoUser());
      setSession(null);
      setLoading(false);
      return;
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setDemoActive(false);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // On login/token refresh — re-bind existing browser push subscription
        // to the current user (handles mom↔dad switch on the same device).
        // GUARD: Notification.permission can crash on Android WebView, so check and wrap in try/catch.
        if (event === "SIGNED_IN" && session?.user && isPushSupported()) {
          try {
            // On Android WebView, Notification.permission may throw or be unavailable.
            // Only subscribe if we can safely check permission.
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              subscribeToPush(session.user.id).catch((err) => {
                // eslint-disable-next-line no-console
                console.warn("Plugin error skipped:", err);
              });
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("Plugin error skipped:", err);
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [demoActive]);

  const startDemo = () => {
    startDemoSession();
    setDemoActive(true);
    setSession(null);
    setUser(createDemoUser());
    setLoading(false);
    toast({
      title: t("Демо-режим включён 🦊", "Demo mode is on 🦊"),
      description: t("Можно попробовать уроки без регистрации. Родительский контроль подключается после аккаунта.", "Try lessons without signing up. Create an account to use parental controls."),
    });
  };

  const signUp = async (email: string, password: string, firstName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
          },
        },
      });

      if (error) {
        toast({
          title: t("Ошибка регистрации", "Couldn’t sign up"),
          description: getAuthError(error, "sign-up", t),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("Регистрация успешна! 🎉", "Account created! 🎉"),
          description: t("Добро пожаловать в Умный Лисенок!", "Welcome to Clever Little Fox!"),
        });
      }

      return { error };
    } catch (error) {
      const authError = error instanceof Error ? error : new Error("Неизвестная ошибка регистрации");
      toast({
        title: t("Ошибка регистрации", "Couldn’t sign up"),
        description: getAuthError(authError, "sign-up", t),
        variant: "destructive",
      });
      return { error: authError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: t("Ошибка входа", "Couldn’t sign in"),
          description: getAuthError(error, "sign-in", t),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("Добро пожаловать обратно! 🦊", "Welcome back! 🦊"),
        });
      }

      return { error };
    } catch (error) {
      const authError = error instanceof Error ? error : new Error("Неизвестная ошибка входа");
      toast({
        title: t("Ошибка входа", "Couldn’t sign in"),
        description: getAuthError(authError, "sign-in", t),
        variant: "destructive",
      });
      return { error: authError };
    }
  };

  const signOut = async () => {
    try {
      if (demoActive || isDemoUser(user)) {
        clearDemoSession();
        setDemoActive(false);
        setSession(null);
        setUser(null);
        return;
      }

      // IMPORTANT: unsubscribe BEFORE auth.signOut() so RLS (auth.uid() = user_id)
      // still allows deleting the push_subscriptions row for this device.
      try {
        await unsubscribeFromPush();
      } catch (e) {
        console.warn("push unsubscribe failed", e);
      }

      await supabase.auth.signOut();
      sessionStorage.removeItem("activeChildId");
      sessionStorage.removeItem("activeChildName");
      toast({
        title: t("До скорой встречи! 👋", "See you soon! 👋"),
      });
    } catch (error) {
      const authError = error instanceof Error ? error : new Error("Неизвестная ошибка выхода");
      toast({
        title: t("Ошибка", "Error"),
        description: t("Не удалось выйти из аккаунта.", "Couldn’t sign out."),
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, signUp, signIn, signOut, startDemo, isDemo: demoActive || isDemoUser(user), loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
