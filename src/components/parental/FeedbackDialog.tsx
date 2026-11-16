import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquareHeart, Send, Mail } from "lucide-react";

const SUPPORT_EMAIL = "masterklick1@gmail.com";

const CATEGORIES = [
  { id: "idea", emoji: "💡", label: "Идея или пожелание" },
  { id: "bug", emoji: "🐞", label: "Нашёл ошибку" },
  { id: "question", emoji: "❓", label: "Вопрос" },
  { id: "other", emoji: "💬", label: "Другое" },
] as const;

/** Кнопка и форма обратной связи для родителей. */
export function FeedbackDialog() {
  const { t, label } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sentOpen, setSentOpen] = useState(false);
  const [category, setCategory] = useState<string>("idea");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const text = message.trim();
    if (text.length < 3) {
      toast({
        title: t("Напишите сообщение", "Write a message"),
        description: t("Расскажите, что случилось или что хотелось бы улучшить.", "Tell us what happened or what you’d like us to improve."),
        variant: "destructive",
      });
      return;
    }
    if (!user?.id) return;

    setSending(true);
    const { error } = await supabase.functions.invoke("send-parent-feedback", {
      body: { category, message: text.slice(0, 2000) },
    });
    setSending(false);

    if (error) {
      toast({
        title: t("Не удалось отправить", "Couldn’t send the message"),
        description: t("Проверьте интернет и попробуйте ещё раз.", "Check your internet connection and try again."),
        variant: "destructive",
      });
      return;
    }

    setMessage("");
    setCategory("idea");
    setOpen(false);
    setSentOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <MessageSquareHeart className="w-4 h-4" />
          <span className="hidden sm:inline">{t("Обратная связь", "Feedback")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Обратная связь", "Feedback")}</DialogTitle>
          <DialogDescription>
            {t("Ваше сообщение получит команда разработчиков «Умного Лисёнка». Мы читаем каждое обращение и учитываем пожелания в следующих обновлениях.", "Your message goes to the Clever Little Fox team. We read every message as we work on future updates.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("О чём хотите написать?", "What’s your feedback about?")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    category === c.id
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-muted/60"
                  }`}
                >
                  <span className="mr-1">{c.emoji}</span>
                  {label(c.label)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-text">{t("Ваше сообщение", "Your message")}</Label>
            <Textarea
              id="feedback-text"
              value={message}
              maxLength={2000}
              rows={5}
              placeholder={t("Например: хотелось бы больше заданий по чтению для 5 лет…", "For example, we’d love more reading activities for five-year-olds…")}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="text-xs text-muted-foreground text-right">{message.length}/2000</div>
          </div>

          <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Mail className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {t("Нужен быстрый ответ? Напишите напрямую:", "Need a quick reply? Email us at")}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
                {SUPPORT_EMAIL}
              </a>
              {t(". Ответ придёт на вашу почту", ". We’ll reply by email.")} {user?.email ?? ""}.
            </span>
          </div>

          <Button onClick={submit} disabled={sending} className="w-full gap-2">
            <Send className="w-4 h-4" />
            {sending ? t("Отправляем…", "Sending…") : t("Отправить", "Send")}
          </Button>
        </div>
      </DialogContent>

      {/* Баннер благодарности после успешной отправки */}
      <Dialog open={sentOpen} onOpenChange={setSentOpen}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="text-6xl">🦊</div>
          <DialogHeader className="items-center space-y-2">
            <DialogTitle className="text-2xl">{t("Спасибо за отзыв!", "Thanks for your feedback!")}</DialogTitle>
            <DialogDescription className="text-base">
              {t("Вы помогаете сделать «Умного Лисёнка» лучше. Мы уже читаем ваше сообщение и обязательно его учтём. Если оставили почту — ответим вам на неё.", "Your feedback helps improve Clever Little Fox. If you left your email address, we’ll reply there.")}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setSentOpen(false)} className="w-full">
            {t("Хорошо", "OK")}
          </Button>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
