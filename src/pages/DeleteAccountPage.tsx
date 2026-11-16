import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function DeleteAccountPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{t("Удаление аккаунта — Умный Лисёнок", "Delete your account — Clever Little Fox")}</h1>
        <p className="text-muted-foreground mb-6">
          {t("Приложение: «Умный Лисёнок» (umnilisenok). Разработчик: Bakhtovar Kosimov.", "Clever Little Fox (umnilisenok) is developed by Bakhtovar Kosimov.")}
        </p>

        <Card className="p-5 mb-4">
          <h2 className="text-xl font-semibold mb-3">{t("Как удалить аккаунт из приложения", "Delete your account in the app")}</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>{t("Откройте приложение «Умный Лисёнок» и войдите в свой аккаунт.", "Open Clever Little Fox and sign in.")}</li>
            <li>{t("Нажмите значок «Настройки» в нижней панели.", "Tap Settings in the bottom navigation.")}</li>
            <li>{t("Прокрутите страницу вниз до раздела «Удаление аккаунта».", "Scroll down to Account deletion.")}</li>
            <li>{t("Нажмите кнопку «Удалить аккаунт».", "Tap Delete account.")}</li>
            <li>{t("Подтвердите удаление — аккаунт и связанные данные удаляются сразу и безвозвратно.", "Confirm to permanently delete the account and associated data immediately.")}</li>
          </ol>
        </Card>

        <Card className="p-5 mb-4">
          <h2 className="text-xl font-semibold mb-3">{t("Как запросить удаление без приложения", "Request deletion without the app")}</h2>
          <p className="text-sm">
            {t("Отправьте письмо на адрес", "Send an email to")}{" "}
            <a className="text-primary underline" href="mailto:umnilisenok@gmail.com">
              umnilisenok@gmail.com
            </a>{" "}
            {t("с темой «Удаление аккаунта» и укажите e-mail, на который зарегистрирован аккаунт. Запрос обрабатывается в течение 30 дней.", "with the subject “Account deletion” and include your account email address. The request is handled within 30 days.")}
          </p>
        </Card>

        <Card className="p-5 mb-4">
          <h2 className="text-xl font-semibold mb-3">{t("Какие данные удаляются", "Data that gets deleted")}</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>{t("Учётная запись и e-mail, профиль (имя, аватар, роль).", "Account, email address and profile, including name, avatar and role.")}</li>
            <li>{t("Связи «родитель — ребёнок» и коды приглашений.", "Parent–child links and invitation codes.")}</li>
            <li>{t("История геолокации, события геозон, SOS-сигналы, сохранённые места.", "Location history, safe zone events, SOS alerts and saved places.")}</li>
            <li>{t("Запросы мониторинга и присланные фото/аудио в хранилище.", "Monitoring requests and stored photos and audio sent in response.")}</li>
            <li>{t("Прогресс обучения, звёзды, достижения, питомцы, комната и галерея рисунков.", "Learning progress, stars, achievements, pets, room and drawing gallery.")}</li>
            <li>{t("Подписки на push-уведомления.", "Push notification subscriptions.")}</li>
          </ul>
        </Card>

        <Card className="p-5 mb-4">
          <h2 className="text-xl font-semibold mb-3">{t("Что и сколько хранится", "Backup retention")}</h2>
          <p className="text-sm">
            {t("После удаления аккаунта перечисленные данные стираются из активной базы сразу. Резервные копии, содержащие эти данные, автоматически перезаписываются в течение 30 дней. Никакие данные не сохраняются дольше этого срока, кроме случаев, когда этого требует закон.", "Deleting the account removes these data from the active database immediately. Backups containing these data are automatically overwritten within 30 days. We retain data longer only where required by law.")}
          </p>
        </Card>

        <Link to="/" className="text-sm text-primary underline">
          {t("Вернуться в приложение", "Back to the app")}
        </Link>
      </div>
    </div>
  );
}
