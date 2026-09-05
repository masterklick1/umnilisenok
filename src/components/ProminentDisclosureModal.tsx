import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ProminentDisclosureModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

const DEFAULT_TITLE = "📍 Геолокация в фоновом режиме";
const DEFAULT_DESCRIPTION =
  "Приложение «Умный Лисёнок» собирает данные о местоположении в фоновом режиме, чтобы " +
  "родители могли видеть геопозицию ребёнка на карте в реальном времени, даже когда " +
  "приложение закрыто или не используется. Нажмите «Понятно» для перехода к настройкам " +
  "разрешений.";

export function ProminentDisclosureModal({
  open,
  onConfirm,
  onCancel,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  confirmLabel = "Понятно",
  cancelLabel = "Отмена",
}: ProminentDisclosureModalProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base mt-4">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex gap-2 pt-2">
          <AlertDialogCancel onClick={onCancel} className="flex-1">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="flex-1">
            {confirmLabel}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
