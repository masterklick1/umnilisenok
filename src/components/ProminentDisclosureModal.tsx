import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProminentDisclosureModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ProminentDisclosureModal({ open, onConfirm, onCancel }: ProminentDisclosureModalProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">📍 Доступ к местоположению</AlertDialogTitle>
          <AlertDialogDescription className="text-base mt-3">
            Приложение «Умный Лисёнок» собирает данные о местоположении в фоновом режиме, чтобы
            родители могли видеть геопозицию ребёнка на карте в реальном времени, даже когда
            приложение закрыто или не используется. Нажмите «Понятно» для перехода к настройкам
            разрешений.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex gap-2 pt-2">
          <AlertDialogCancel onClick={onCancel} className="flex-1">
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="flex-1">
            Понятно / Настроить
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
