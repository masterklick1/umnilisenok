import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Удаление аккаунта — Умный Лисёнок</h1>
        <p className="text-muted-foreground mb-6">
          Приложение: «Умный Лисёнок» (umnilisenok). Разработчик: Bakhtovar Kosimov.
        </p>

        <Card className="p-5 mb-4">
          <h2 className="text-xl font-semibold mb-3">Как удалить аккаунт из приложения</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>Откройте приложение «Умный Лисёнок» и войдите в свой аккаунт.</li>
            <li>Нажмите значок «Настройки» в нижней панели.</li>
            <li>Прокрутите страницу вниз до раздела «Удаление аккаунта».</li>
            <li>Нажмите кнопку «Удалить аккаунт».</li>
            <li>Подтвердите удаление — аккаунт и связанные данные удаляются сразу и безвозвратно.</li>
          </ol>
        </Card>

        <Card className="p-5 mb-4">
          <h2 className="text-xl font-semibold mb-3">Как запросить удаление без приложения</h2>
          <p className="text-sm">
            Отправьте письмо на адрес{" "}
            <a className="text-primary underline" href="mailto:umnilisenok@gmail.com">
              umnilisenok@gmail.com
            </a>{" "}
            с темой «Удаление аккаунта» и укажите e-mail, на который зарегистрирован аккаунт. Запрос
            обрабатывается в течение 30 дней.
          </p>
        </Card>

        <Card className="p-5 mb-4">
          <h2 className="text-xl font-semibold mb-3">Какие данные удаляются</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Учётная запись и e-mail, профиль (имя, аватар, роль).</li>
            <li>Связи «родитель — ребёнок» и коды приглашений.</li>
            <li>История геолокации, события геозон, SOS-сигналы, сохранённые места.</li>
            <li>Запросы мониторинга и присланные фото/аудио в хранилище.</li>
            <li>Прогресс обучения, звёзды, достижения, питомцы, комната и галерея рисунков.</li>
            <li>Подписки на push-уведомления.</li>
          </ul>
        </Card>

        <Card className="p-5 mb-4">
          <h2 className="text-xl font-semibold mb-3">Что и сколько хранится</h2>
          <p className="text-sm">
            После удаления аккаунта перечисленные данные стираются из активной базы сразу. Резервные
            копии, содержащие эти данные, автоматически перезаписываются в течение 30 дней. Никакие
            данные не сохраняются дольше этого срока, кроме случаев, когда этого требует закон.
          </p>
        </Card>

        <Link to="/" className="text-sm text-primary underline">
          Вернуться в приложение
        </Link>
      </div>
    </div>
  );
}
